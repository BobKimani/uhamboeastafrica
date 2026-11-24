"""Administrator account management (there is no public registration).

Run inside the backend container on the VPS:

    docker compose ... exec backend python -m app.admin_cli create --email admin@example.com --name "Admin Name"
    docker compose ... exec backend python -m app.admin_cli list
    docker compose ... exec backend python -m app.admin_cli set-password --email admin@example.com
    docker compose ... exec backend python -m app.admin_cli disable --email admin@example.com
    docker compose ... exec backend python -m app.admin_cli enable --email admin@example.com
    docker compose ... exec backend python -m app.admin_cli revoke-sessions --email admin@example.com
    docker compose ... exec backend python -m app.admin_cli purge-sessions

Passwords are read interactively (hidden, entered twice) and never accepted as
command-line arguments, so they do not end up in shell history or `ps` output.
For non-interactive provisioning use --password-stdin, e.g. from a secrets file:
    docker compose ... exec -T backend python -m app.admin_cli create --email ... --password-stdin < secret.txt
"""

from __future__ import annotations

import argparse
import getpass
import sys
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.admin_models import AdminSession, AdminUser
from app.services.admin_auth import (
    PasswordPolicyError,
    hash_password,
    normalize_email,
    purge_expired_sessions,
    revoke_all_sessions,
    utcnow,
    validate_password_policy,
)


class CliError(Exception):
    pass


def _read_password(args, email: str, stdin=None, prompt=getpass.getpass) -> str:
    if args.password_stdin:
        password = (stdin or sys.stdin).readline().rstrip("\r\n")
    else:
        password = prompt("New password: ")
        if password != prompt("Repeat password: "):
            raise CliError("Passwords do not match")
    try:
        validate_password_policy(password, email)
    except PasswordPolicyError as exc:
        raise CliError(str(exc)) from exc
    return password


def _get_admin(db: Session, email: str) -> AdminUser:
    admin = db.scalar(select(AdminUser).where(AdminUser.email == normalize_email(email)))
    if admin is None:
        raise CliError(f"No administrator with email {normalize_email(email)}")
    return admin


def _validate_email(email: str) -> str:
    email = normalize_email(email)
    local, _, domain = email.partition("@")
    if not local or "." not in domain or len(email) > 320 or " " in email:
        raise CliError("Enter a valid email address")
    return email


def cmd_create(db: Session, args, **io) -> str:
    email = _validate_email(args.email)
    if db.scalar(select(AdminUser).where(AdminUser.email == email)):
        raise CliError(f"Administrator {email} already exists")
    password = _read_password(args, email, **io)
    admin = AdminUser(
        email=email,
        name=(args.name or "").strip() or None,
        password_hash=hash_password(password),
        is_active=True,
    )
    db.add(admin)
    db.flush()
    return f"Created administrator {email} ({admin.id})"


def cmd_list(db: Session, args, **io) -> str:
    admins = db.scalars(select(AdminUser).order_by(AdminUser.created_at)).all()
    if not admins:
        return "No administrators. Create one with: python -m app.admin_cli create --email ..."
    now = utcnow()
    lines = [f"{'EMAIL':<36} {'NAME':<22} {'ACTIVE':<7} {'SESSIONS':<9} LAST LOGIN"]
    for admin in admins:
        sessions = db.scalars(
            select(AdminSession)
            .where(AdminSession.admin_user_id == admin.id)
            .where(AdminSession.revoked_at.is_(None))
            .where(AdminSession.expires_at > now)
        ).all()
        last = admin.last_login_at.isoformat(timespec="minutes") if admin.last_login_at else "-"
        lines.append(
            f"{admin.email:<36} {(admin.name or '-'):<22} "
            f"{'yes' if admin.is_active else 'no':<7} {len(sessions):<9} {last}"
        )
    return "\n".join(lines)


def cmd_set_password(db: Session, args, **io) -> str:
    admin = _get_admin(db, args.email)
    password = _read_password(args, admin.email, **io)
    admin.password_hash = hash_password(password)
    admin.password_changed_at = utcnow()
    admin.updated_at = utcnow()
    revoked = revoke_all_sessions(db, admin.id)
    return f"Password updated for {admin.email}; {revoked} session(s) signed out"


def cmd_disable(db: Session, args, **io) -> str:
    admin = _get_admin(db, args.email)
    admin.is_active = False
    admin.updated_at = utcnow()
    revoked = revoke_all_sessions(db, admin.id)
    return f"Disabled {admin.email}; {revoked} session(s) signed out"


def cmd_enable(db: Session, args, **io) -> str:
    admin = _get_admin(db, args.email)
    admin.is_active = True
    admin.updated_at = utcnow()
    return f"Enabled {admin.email}"


def cmd_revoke_sessions(db: Session, args, **io) -> str:
    admin = _get_admin(db, args.email)
    return f"{revoke_all_sessions(db, admin.id)} session(s) signed out for {admin.email}"


def cmd_purge_sessions(db: Session, args, **io) -> str:
    return f"Removed {purge_expired_sessions(db)} expired session/login-attempt record(s)"


COMMANDS: dict[str, Callable[..., str]] = {
    "create": cmd_create,
    "list": cmd_list,
    "set-password": cmd_set_password,
    "disable": cmd_disable,
    "enable": cmd_enable,
    "revoke-sessions": cmd_revoke_sessions,
    "purge-sessions": cmd_purge_sessions,
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.admin_cli", description="Manage Uhambo administrators")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create", help="Create an administrator")
    create.add_argument("--email", required=True)
    create.add_argument("--name")
    create.add_argument("--password-stdin", action="store_true", help="Read the password from stdin")

    sub.add_parser("list", help="List administrators")

    set_password = sub.add_parser("set-password", help="Change a password (signs out all sessions)")
    set_password.add_argument("--email", required=True)
    set_password.add_argument("--password-stdin", action="store_true")

    for name, help_text in (
        ("disable", "Disable an administrator (signs out all sessions)"),
        ("enable", "Re-enable an administrator"),
        ("revoke-sessions", "Sign out all sessions of an administrator"),
    ):
        command = sub.add_parser(name, help=help_text)
        command.add_argument("--email", required=True)

    sub.add_parser("purge-sessions", help="Delete long-expired sessions and old login attempts")
    return parser


def run(argv: list[str] | None = None, *, session_factory=None, **io) -> int:
    args = build_parser().parse_args(argv)
    if session_factory is None:
        from app.db.session import SessionLocal

        session_factory = SessionLocal

    with session_factory() as db:
        try:
            message = COMMANDS[args.command](db, args, **io)
            db.commit()
        except CliError as exc:
            db.rollback()
            print(f"Error: {exc}", file=sys.stderr)
            return 1
    print(message)
    return 0


if __name__ == "__main__":
    sys.exit(run())
