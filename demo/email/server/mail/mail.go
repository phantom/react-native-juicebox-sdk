package mail

import (
	"crypto/tls"
	"fmt"
	"html/template"
	"net/mail"
	"net/smtp"
	"net/url"

	"github.com/google/uuid"
)

const serverName = "smtp-relay.gmail.com"
const serverPort = 465

type TemplateOptions struct {
	Token    string
	AppName  string
	LogoPath string
}

func SendMagicLink(email string, token string) error {

	uuid, err := uuid.NewRandom()
	if err != nil {
		return err
	}

	noReplyAddress := mail.Address{
		Name:    "Juicebox",
		Address: fmt.Sprintf("no-reply-%s@juicebox.me", uuid.String()),
	}

	subject := "Confirm your e-mail"

	templateOptions := TemplateOptions{
		Token:    url.QueryEscape(token),
		AppName:  "Juicebox",
		LogoPath: "https://assets-global.website-files.com/64650413ab0c96a6b686cac9/6467eec48e8cabed89c29dc4_juicebox-logo-purple.png",
	}

	bodyTemplate, err := template.ParseFiles("templates/mail.html")
	if err != nil {
		return err
	}

	// Setup headers
	headers := make(map[string]string)
	headers["From"] = noReplyAddress.String()
	headers["To"] = email
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	// Setup message
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n"

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

	if err := client.Rcpt(email); err != nil {
		return err
	}

	// Send the email message
	wc, err := client.Data()
	if err != nil {
		return err
	}
	defer wc.Close()

	_, err = fmt.Fprint(wc, message)
	if err != nil {
		return err
	}

	err = bodyTemplate.Execute(wc, templateOptions)
	if err != nil {
		return err
	}

	return nil
}
