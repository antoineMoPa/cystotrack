variable "project_name" {
  type    = string
  default = "cystotrack"
}
variable "app_url" {
  type    = string
  default = "https://cystotrack.pages.dev"
}
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}
variable "cloudflare_account_id" {
  type = string
}
variable "supabase_access_token" {
  type      = string
  sensitive = true
}
variable "supabase_organization_id" {
  type = string
}
variable "supabase_database_password" {
  type      = string
  sensitive = true
}
variable "supabase_region" {
  type    = string
  default = "ca-central-1"
}
variable "supabase_url" {
  type = string
}
variable "supabase_anon_key" {
  type      = string
  sensitive = true
}
