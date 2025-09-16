variable "project_name" {
  description = "Project name used to name resources"
  type        = string
  default     = "particle-curl-shader"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

// aws_profile not needed when using remote backend and CI credentials


