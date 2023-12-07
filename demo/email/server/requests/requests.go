package requests

type EmailTokenRequest struct {
	Email    string `json:"email"`
	AppName  string `json:"appName"`
	LogoPath string `json:"logoPath"`
}

type JuiceboxTokenRequest struct {
	RealmID string `json:"realmID"`
}
