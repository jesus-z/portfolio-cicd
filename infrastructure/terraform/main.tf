terraform {
  required_version = ">= 1.12, < 2.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 7.0"
    }
  }

  backend "oci" {
    auth                = "APIKey"
    config_file_profile = "DEFAULT"
  }
}

provider "oci" {
  config_file_profile = "DEFAULT"
}

variable "compartment_ocid" {
  description = "OCID del compartimento donde se crearán los recursos."
  type        = string
}

variable "availability_domain" {
  description = "Dominio de disponibilidad de la VM, por ejemplo Uocm:US-ASHBURN-AD-1."
  type        = string
}

variable "image_ocid" {
  description = "OCID de Ubuntu 24.04 para la arquitectura seleccionada."
  type        = string
}

variable "ssh_public_key" {
  description = "Clave pública que se instalará para el usuario ubuntu."
  type        = string
}

variable "shape" {
  description = "Forma OCI compatible con la arquitectura de la imagen."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  type    = number
  default = 1
}

variable "memory_in_gbs" {
  type    = number
  default = 6
}

resource "oci_core_vcn" "portfolio" {
  compartment_id = var.compartment_ocid
  display_name   = "portfolio-cicd-vcn"
  cidr_block     = "10.40.0.0/16"
  dns_label      = "portfoliocicd"
}

resource "oci_core_internet_gateway" "portfolio" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio.id
  display_name   = "portfolio-cicd-internet-gateway"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio.id
  display_name   = "portfolio-cicd-public-routes"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.portfolio.id
  }
}

resource "oci_core_security_list" "web" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.portfolio.id
  display_name   = "portfolio-cicd-web-security"

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                      = oci_core_vcn.portfolio.id
  display_name                = "portfolio-cicd-public-subnet"
  cidr_block                  = "10.40.1.0/24"
  route_table_id              = oci_core_route_table.public.id
  security_list_ids           = [oci_core_security_list.web.id]
  prohibit_public_ip_on_vnic = false
  dns_label                  = "public"
}

resource "oci_core_instance" "portfolio" {
  availability_domain = var.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "portfolio-cicd"
  shape               = var.shape

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_in_gbs
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "portfolio-cicd-vnic"
  }

  source_details {
    source_type             = "image"
    source_id               = var.image_ocid
    boot_volume_size_in_gbs = 50
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  freeform_tags = {
    Project = "portfolio-cicd"
  }
}

data "oci_core_vnic_attachments" "portfolio" {
  compartment_id = var.compartment_ocid
  instance_id    = oci_core_instance.portfolio.id
}

data "oci_core_vnic" "portfolio" {
  vnic_id = data.oci_core_vnic_attachments.portfolio.vnic_attachments[0].vnic_id
}

output "instance_id" {
  value = oci_core_instance.portfolio.id
}

output "public_ip" {
  value = data.oci_core_vnic.portfolio.public_ip_address
}
