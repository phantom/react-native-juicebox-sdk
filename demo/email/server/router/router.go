package router

import (
	cryptoRand "crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/juicebox-systems/react-native-juicebox-sdk/demo-server/mail"
	"github.com/juicebox-systems/react-native-juicebox-sdk/demo-server/requests"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/crypto/acme/autocert"
)

// Used to sign a JWT token for a Juicebox Realm. In a real word scenario,
// this should be read from some secure secret storage, but for a demo this
// is acceptable.
var realmSigningKey = []byte{0x50, 0x77, 0xa1, 0xfd, 0x9d, 0xfb, 0xd6, 0x0e, 0xd0, 0xc7, 0x65, 0xca, 0x11, 0x4f, 0x67, 0x50, 0x8e, 0x65, 0xa1, 0x85, 0x0d, 0x39, 0x00, 0x19, 0x9e, 0xfc, 0x8a, 0x5f, 0x3d, 0xe6, 0x2c, 0x15}

const realmSigningKeyVersion = 1
const realmTenantName = "juiceboxdemo"

// Used to sign a JWT provided to a user after e-mail verification, which can
// be used for authenticated requests against this server.
// In a real word scenario, this should be read from some secure secret storage,
// but for a demo this is acceptable.
var signingKey = []byte{0xbe, 0xfc, 0x3c, 0xc8, 0x3b, 0xfe, 0xa8, 0x91, 0xc1, 0xad, 0x27, 0xdd, 0x31, 0x9b, 0xe0, 0x33, 0xaf, 0xa3, 0xe9, 0x98, 0x44, 0xb4, 0x41, 0xa9, 0x2c, 0x5e, 0x43, 0x6a, 0x28, 0x1c, 0xdf, 0x1d}

var mutex = sync.Mutex{}
var emailSigningKeys = map[string][]byte{}

func RunRouter() {
	e := echo.New()
	e.HideBanner = true
	e.AutoTLSManager.Cache = autocert.DirCache("/var/www/.cache")

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Fetch a JWT token for a Juicebox Realm, using a `JuiceboxTokenRequest`.
	//
	// Requires authentication with a signed JWT acquired through e-mail verification.
	e.POST("/juicebox-token", func(c echo.Context) error {
		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return contextAwareError(c, http.StatusInternalServerError, "Error reading request body")
		}

		var request requests.JuiceboxTokenRequest
		err = json.Unmarshal(body, &request)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error unmarshalling request body")
		}

		requestToken, ok := c.Get("user").(*jwt.Token)
		if !ok {
			return contextAwareError(c, http.StatusBadRequest, "Error fetching request token")
		}

		subject, err := requestToken.Claims.GetSubject()
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Missing subject")
		}

		claims := jwt.MapClaims{
			"iss": realmTenantName,
			"sub": subject,
			"aud": request.RealmID,
			"nbf": jwt.NewNumericDate(time.Now()),
			"exp": jwt.NewNumericDate(time.Now().Add(time.Minute * 10)),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		token.Header["kid"] = fmt.Sprintf("%s:%d", realmTenantName, realmSigningKeyVersion)

		signedToken, err := token.SignedString(realmSigningKey)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error signing token")
		}

		return c.String(http.StatusOK, signedToken)
	}, middleware.BodyLimit("2K"), echojwt.WithConfig(echojwt.Config{
		KeyFunc: func(t *jwt.Token) (interface{}, error) {
			return signingKey, nil
		},
	}))

	// Finishes e-mail verification and acquires an auth token for future requests
	// against this server. This token can be used multiple times to request Juicebox
	// tokens for multiple realms.
	//
	// Requires and consumes a one-time signed token sent to the user's e-mail, to verify
	// their identity.
	e.GET("/auth-token", func(c echo.Context) error {
		requestToken, ok := c.Get("user").(*jwt.Token)
		if !ok {
			return contextAwareError(c, http.StatusBadRequest, "Error fetching request token")
		}

		subject, err := requestToken.Claims.GetSubject()
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Missing subject")
		}

		claims := jwt.RegisteredClaims{
			Issuer:    "juicebox",
			Subject:   subject,
			NotBefore: jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute * 10)),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

		signedToken, err := token.SignedString(signingKey)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error signing token")
		}

		mutex.Lock()
		defer mutex.Unlock()
		emailSigningKeys[subject] = nil

		return c.String(http.StatusOK, signedToken)
	}, middleware.BodyLimit("2K"), echojwt.WithConfig(echojwt.Config{
		KeyFunc: func(t *jwt.Token) (interface{}, error) {
			kid, ok := t.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing kid in token header")
			}
			signingKey, ok := emailSigningKeys[kid]
			if !ok {
				return nil, fmt.Errorf("missing signing key for kid %s", kid)
			}
			return signingKey, nil
		},
	}))

	// Triggers the send of an e-mail to the user containing a one-time use token
	// that can be used to acquire a longer lived authentication token for this server.
	//
	// Takes the request parameters specified in `EmailTokenRequest`
	e.POST("/email-token", func(c echo.Context) error {
		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return contextAwareError(c, http.StatusInternalServerError, "Error reading request body")
		}

		var request requests.EmailTokenRequest
		err = json.Unmarshal(body, &request)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error unmarshalling request body")
		}

		signingKey := make([]byte, 32)
		_, err = cryptoRand.Read(signingKey)
		if err != nil {
			return contextAwareError(c, http.StatusInternalServerError, "Error generating one-time signing key")
		}

		mutex.Lock()
		defer mutex.Unlock()
		emailSigningKeys[request.Email] = signingKey

		claims := jwt.RegisteredClaims{
			Issuer:    "juicebox",
			Subject:   request.Email,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute * 10)),
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		token.Header["kid"] = request.Email

		signedToken, err := token.SignedString(signingKey)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error signing token")
		}

		err = mail.SendMagicLink(request, signedToken)
		if err != nil {
			return contextAwareError(c, http.StatusBadRequest, "Error sending email")
		}

		return c.NoContent(http.StatusOK)
	}, middleware.BodyLimit("2K"))

	// Returns the mapping to allow iOS apps to be opened from deep links, e.g. the links
	// included in the emails.
	e.GET("/.well-known/apple-app-site-association", func(c echo.Context) error {
		c.Response().Header().Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		return c.String(http.StatusOK, `
{
	"applinks": {
		"apps": [],
		"details": [
			{
				"appID": "YNAAAM6D98.xyz.juicebox.jbd2",
				"paths": [
					"/*"
				]
			},
			{
				"appID": "D5LDRT5BB3.xyz.juicebox.jbd",
				"paths": [
					"/*"
				]
			},
			{
				"appID": "D5LDRT5BB3.xyz.juicebox.emailDemo",
				"paths": [
					"/*"
				]
			},
			{
				"appID": "D5LDRT5BB3.xyz.juicebox.demo",
				"paths": [
					"/*"
				]
			}
		]
	}
}
		`)
	})

	// Returns the mapping to allow android apps to be opened by deep links, e.g. the links
	// included in the emails.
	e.GET("/.well-known/assetlinks.json", func(c echo.Context) error {
		c.Response().Header().Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		return c.String(http.StatusOK, `
[{
	"relation": ["delegate_permission/common.handle_all_urls"],
	"target" : {
		"namespace": "android_app",
		"package_name": "xyz.juicebox.emailDemo",
		"sha256_cert_fingerprints": [
			"E2:F9:62:B4:C8:34:C1:CF:61:BF:2F:8E:D6:28:0C:13:BE:B9:06:B9:8D:D7:CB:22:56:A5:5B:13:11:58:7B:F8",
			"89:C1:BA:CA:54:CD:CE:B3:67:6B:1A:22:70:74:B3:DB:6D:A4:61:AB:B2:D3:C8:86:7D:53:7A:7D:83:7E:99:50"
		]
	}
}]
		`)
	})

	e.Logger.Fatal(e.StartAutoTLS(":443"))
}

func contextAwareError(c echo.Context, code int, str string) error {
	select {
	case <-c.Request().Context().Done():
		// for ease of monitoring, use 499 (client closed request)
		// rather than 400 or 500 when the request was canceled.
		return c.String(499, "Client closed request")
	default:
		return c.String(code, str)
	}
}
