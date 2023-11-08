package requests

type EmailTokenRequest struct {
	Email string `json:"email"`
}

type JuiceboxTokenRequest struct {
	RealmID string `json:"realmID"`
}
