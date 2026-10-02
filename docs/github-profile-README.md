# Keenen Wilkins

**Cloud Architecture and DevSecOps** · Kansas City, Missouri

AWS Certified Solutions Architect, moving into cloud infrastructure from eight years of high volume operations. I build things that reach a live environment, take real traffic or real attacker traffic, and get written up afterward.

[Portfolio](https://REPLACE_WITH_YOUR_SITE_URL) · [LinkedIn](https://www.linkedin.com/in/keenenw) · keenenwilkins@gmail.com

---

## Selected work

| Project | What it does |
| --- | --- |
| [AWS DevSecOps Threat Pipeline](https://github.com/cruisethecity/aws-devsecops-threat-pipeline) | Splunk ingests VPC Flow Logs and CloudTrail, correlation searches mapped to MITRE ATT&CK raise the alert, and a Python Lambda drops a deny rule into the network ACL. Terraform provisioned end to end. |
| [AWS Incident Response Honeypot](https://github.com/cruisethecity/aws-incident-response-honeypot) | A deliberately exposed host in a locked down VPC that captured unsolicited attack traffic into a Splunk SOC. The threat actor data is organic, not simulated. |
| [SecureAccess Audit Dashboard](https://github.com/cruisethecity/SecureAccess-Audit-Dashboard) | Browser based access log review that scores every session against several risk signals at once, so a reviewer opens the accounts worth investigating instead of scrolling the whole file. No backend. |
| [AWS RHEL LogVault Automation](https://github.com/cruisethecity/AWS-RHEL-LogVault-Automation) | Scheduled Bash and systemd automation that collects, compresses and ships RHEL 9 journal data to S3 using IAM roles, so there are no keys on the host. |
| [AWS Three Tier Architecture](https://github.com/cruisethecity/portfolio-3tier) | VPC, EC2 and RDS across public and private subnets, provisioned with Terraform. |
| [AWS RHEL S3 WebBridge](https://github.com/cruisethecity/AWS-RHEL-S3-WebBridge) | Automated deployment of a RHEL 9 web server on EC2 with S3 content integration. |

## Certifications

AWS Certified Solutions Architect, Associate · AWS Certified Cloud Practitioner · Linux Essentials, LPI 010 · Oracle Cloud Infrastructure Foundations Associate · Google IT Support Professional

HashiCorp Certified Terraform Associate, in progress.

## Currently

- B.S. Cloud Computing, AWS track, Western Governors University
- Technology leadership internship, i.c.stars
- Building the serverless portfolio you are looking at, with Terraform and keyless GitHub Actions

## How I work

Infrastructure is code or it did not happen. Nothing reaches production without a readable plan diff. Deploy pipelines authenticate with OpenID Connect, so there are no long lived AWS keys anywhere in a repository of mine.
