Demo servers & FTP deployment

This document lists the demo server targets, branch mapping and the GitHub Actions workflow info for SFTP/FTP deployments.

Branch -> server mapping (as used by .github/workflows/deploy-via-sftp.yml):
- main -> /portal.uthutho.co.za/
- Shaqeel -> /shaqeel.portal.uthutho.co.za/
- Waseem -> /waseem.portal.uthutho.co.za/
- Makhi -> /makhi.portal.uthutho.co.za/
- Ishmeal -> /ishmeal.portal.uthutho.co.za/

GitHub workflow
- File: .github/workflows/deploy-via-sftp.yml
- Trigger: push to one of the mapped branches above
- The workflow builds the app and deploys the contents of dist/ to the server directory via FTP using SamKirkland/FTP-Deploy-Action.

Required GitHub secrets (set in repository Settings -> Secrets):
- FTP_SERVER: host or IP of the FTP server
- FTP_USERNAME
- FTP_PASSWORD
- FTP_PORT (optional)

Notes for testers
- When a PR is merged into a demo branch (Shaqeel/Makhi/Waseem/Ishmeal) the build will be pushed to that tester's demo server automatically.
- If your site is not updated, confirm the workflow ran successfully under Actions and check the artifacts/logs.

Security
- Do not store credentials in the repo. Use repository secrets as above.
