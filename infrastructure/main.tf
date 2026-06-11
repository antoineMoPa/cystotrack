terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    key                         = "cystotrack/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.9"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

resource "supabase_project" "app" {
  organization_id   = var.supabase_organization_id
  name              = var.project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region
  instance_size     = "micro"
}

resource "supabase_settings" "app" {
  project_ref = supabase_project.app.id

  auth = jsonencode({
    site_url       = var.app_url
    uri_allow_list = "${var.app_url}/**"
  })
}

resource "cloudflare_pages_project" "app" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "main"
  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }
  deployment_configs = {
    preview = {
      env_vars = {
        VITE_SUPABASE_URL      = { type = "plain_text", value = var.supabase_url }
        VITE_SUPABASE_ANON_KEY = { type = "secret_text", value = var.supabase_anon_key }
      }
    }
    production = {
      env_vars = {
        VITE_SUPABASE_URL      = { type = "plain_text", value = var.supabase_url }
        VITE_SUPABASE_ANON_KEY = { type = "secret_text", value = var.supabase_anon_key }
      }
    }
  }
}

output "supabase_project_ref" {
  value = supabase_project.app.id
}

output "pages_url" {
  value = "https://${cloudflare_pages_project.app.subdomain}"
}
