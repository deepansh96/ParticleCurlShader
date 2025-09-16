#!/usr/bin/env bash
set -euo pipefail

# Configuration (can be overridden via env)
: "${AWS_PROFILE:=indieverse-root}"
: "${AWS_REGION:=ap-south-1}"

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "Using AWS_PROFILE=${AWS_PROFILE}, AWS_REGION=${AWS_REGION}"

echo "Bootstrapping/validating Terraform backend..."
cd "$ROOT_DIR/infra/backend"
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" terraform init -upgrade >/dev/null
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" terraform apply -auto-approve >/dev/null

TFSTATE_BUCKET=$(terraform output -raw tfstate_bucket_name)
TF_LOCKS_TABLE=$(terraform output -raw tf_lock_table_name)
cd "$ROOT_DIR/infra"
echo "Initializing main Terraform with remote backend..."
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" terraform init -reconfigure -backend-config="bucket=${TFSTATE_BUCKET}" -backend-config="key=${PROJECT_NAME:-particle-curl-shader}/terraform.tfstate" -backend-config="region=${AWS_REGION}" -backend-config="dynamodb_table=${TF_LOCKS_TABLE}" >/dev/null

echo "Applying infra changes..."
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" terraform apply -auto-approve >/dev/null

echo "Building website..."
cd "$ROOT_DIR"
npm ci
npm run build

echo "Resolving S3 bucket from Terraform outputs..."
BUCKET_NAME=$(terraform -chdir="$ROOT_DIR/infra" output -raw bucket_name)
WEBSITE_ENDPOINT=$(terraform -chdir="$ROOT_DIR/infra" output -raw website_endpoint || true)
CF_DIST_ID=$(terraform -chdir="$ROOT_DIR/infra" output -raw cloudfront_distribution_id || true)

if [[ -z "${BUCKET_NAME:-}" ]]; then
  echo "Error: Could not determine bucket name. Did you run terraform apply in infra/?" >&2
  exit 1
fi

echo "Syncing dist/ to s3://${BUCKET_NAME} ..."
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws s3 sync "$ROOT_DIR/dist/" "s3://${BUCKET_NAME}" --delete

if [[ -n "${CF_DIST_ID:-}" && "${CF_DIST_ID}" != "<no value>" ]]; then
  echo "Creating CloudFront invalidation for distribution ${CF_DIST_ID} ..."
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" >/dev/null
  echo "Invalidation submitted."
else
  echo "CloudFront distribution id not available; skipping invalidation."
fi

echo "Done."
if [[ -n "${WEBSITE_ENDPOINT:-}" ]]; then
  echo "S3 website endpoint: http://${WEBSITE_ENDPOINT}"
fi
CF_DOMAIN=$(terraform -chdir="$ROOT_DIR/infra" output -raw cloudfront_domain_name || true)
if [[ -n "${CF_DOMAIN:-}" && "${CF_DOMAIN}" != "<no value>" ]]; then
  echo "CloudFront URL: https://${CF_DOMAIN}"
fi


