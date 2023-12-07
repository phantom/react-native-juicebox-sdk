package mail

import (
	"crypto/tls"
	"fmt"
	"html/template"
	"io"
	"net/mail"
	"net/smtp"
	"net/url"

	"github.com/google/uuid"
	"github.com/juicebox-systems/react-native-juicebox-sdk/demo-server/requests"
)

const serverName = "smtp-relay.gmail.com"
const serverPort = 465

type TemplateOptions struct {
	Token    string
	AppName  string
	LogoPath string
}

func SendMagicLink(request requests.EmailTokenRequest, token string) error {

	uuid, err := uuid.NewRandom()
	if err != nil {
		return err
	}

	noReplyAddress := mail.Address{
		Name:    request.AppName,
		Address: fmt.Sprintf("no-reply-%s@juicebox.me", uuid.String()),
	}

	subject := "Confirm your e-mail"

	templateOptions := TemplateOptions{
		Token:    url.QueryEscape(token),
		AppName:  request.AppName,
		LogoPath: request.LogoPath,
	}

	bodyTemplate, err := template.ParseFiles("templates/mail.html")
	if err != nil {
		return err
	}

	// Setup headers
	headers := make(map[string]string)
	headers["From"] = noReplyAddress.String()
	headers["To"] = request.Email
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	tlsConfig := tls.Config{
		InsecureSkipVerify: false,
		ServerName:         serverName,
	}

	conn, err := tls.Dial("tcp", fmt.Sprintf("%s:%d", serverName, serverPort), &tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, serverName)
	if err != nil {
		return err
	}
	defer client.Quit()

	if err := client.Hello("juicebox.me"); err != nil {
		return err
	}

	if err := client.Mail(noReplyAddress.Address); err != nil {
		return err
	}

	if err := client.Rcpt(request.Email); err != nil {
		return err
	}

	// Send the email message
	wc, err := client.Data()
	if err != nil {
		return err
	}
	defer wc.Close()

	// Write headers
	for k, v := range headers {
		_, err = fmt.Fprintf(wc, "%s: %s\r\n", k, v)
		if err != nil {
			return err
		}
	}

	// End headers
	_, err = io.WriteString(wc, "\r\n")
	if err != nil {
		return err
	}

	// Write body
	err = bodyTemplate.Execute(wc, templateOptions)
	if err != nil {
		return err
	}

	return nil
}
