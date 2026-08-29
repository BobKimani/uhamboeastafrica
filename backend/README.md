# Uhambo Backend

The FastAPI backend uses AWS Aurora PostgreSQL Serverless with IAM database authentication for application data. Database passwords are not stored in project files.

## Required Database Environment

Set these in `backend/.env` for local development or as ECS task environment/secrets in AWS:

```env
DB_HOST=<aurora-writer-endpoint>
DB_PORT=5432
DB_NAME=<aurora_database_name>
DB_USER=<iam_database_user>
DB_SSLMODE=require
AWS_REGION=eu-north-1
```

Do not add `DB_PASSWORD`. Do not add a `DATABASE_URL` that contains a password. The backend generates a fresh IAM auth token through the standard AWS SDK credential provider chain whenever SQLAlchemy opens a new physical database connection.

For local development, AWS credentials can come from `aws configure`, AWS SSO, environment credentials, or any other standard AWS SDK credential source. On ECS, the backend should use the ECS task IAM role automatically.

Confirm the active AWS identity before testing:

```bash
aws sts get-caller-identity
```

If this command fails or prompts for login, refresh your local AWS session first:

```bash
aws sso login
```

If you use a named profile, start the backend with `AWS_PROFILE=<profile-name>` exported in the shell or added to your local `backend/.env`. Do not commit `AWS_PROFILE` if it is specific to one developer machine.

## IAM Permission

The IAM principal used locally or by ECS must be allowed to connect to Aurora as the configured PostgreSQL user.

Example policy structure:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rds-db:connect",
      "Resource": "arn:aws:rds-db:<aws-region>:<aws-account-id>:dbuser:<aurora-db-cluster-resource-id>/<postgresql-database-username>"
    }
  ]
}
```

The policy resource requires the AWS region, AWS account ID, Aurora DB cluster resource ID, and PostgreSQL database username. Do not use the cluster name in place of the cluster resource ID.

The PostgreSQL database user must also have the `rds_iam` role:

```sql
GRANT rds_iam TO <postgresql-database-username>;
```

## Manual Token Troubleshooting

Generate a temporary token manually when debugging connectivity:

```bash
aws rds generate-db-auth-token \
  --hostname "$DB_HOST" \
  --port "$DB_PORT" \
  --region "$AWS_REGION" \
  --username "$DB_USER"
```

Use the generated token as the PostgreSQL password only for the immediate test session. IAM database authentication tokens expire, so do not store them.

Example `psql` test:

```bash
PGPASSWORD="$(aws rds generate-db-auth-token --hostname "$DB_HOST" --port "$DB_PORT" --region "$AWS_REGION" --username "$DB_USER")" \
psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER sslmode=$DB_SSLMODE" \
  -c "SELECT 1;"
```

## Local Backend Check

```bash
cd backend
python3 -m venv uhambo
source uhambo/bin/activate
pip install -r requirements.txt
python -m pytest
python -c "import app.main; print('backend import ok')"
uvicorn app.main:app --reload --port 8000
curl -i http://localhost:8000/health
```

The health endpoint returns only safe status information:

```json
{
  "status": "healthy",
  "database": "connected"
}
```
