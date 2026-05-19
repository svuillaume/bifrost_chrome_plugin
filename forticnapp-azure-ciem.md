# FortiCNAPP Azure CIEM Integration

CIEM requires the Configuration integration (reads RBAC via ARM) + Directory Reader Entra ID role (reads identity objects via MS Graph).

---

## Prerequisites (Operator performing the setup)

| Requirement | Details |
|---|---|
| **Entra ID role** | Global Administrator (or Application Administrator + Privileged Role Administrator) |
| **Azure RBAC** | **Owner on all target subscriptions** — required to assign roles to the FortiCNAPP SP in Step 3 |
| **FortiCNAPP account** | Administrator role |

---

## Integration Paths

There are two ways to set up the Azure integration in FortiCNAPP:

---

### Path A — Guided Configuration (Recommended)

**Console**: Settings → Integrations → Cloud accounts → + Add New → Microsoft Azure → **Guided configuration**

The wizard collects your inputs and generates a script you run in **Azure Cloud Shell**. The script:
- Downloads and installs the FortiCNAPP CLI + Terraform
- Runs the full integration setup **non-interactively**
- Creates the App Registration, assigns roles, and configures infrastructure automatically

**You only need to:**
1. Open the wizard in FortiCNAPP
2. Enter your tenant/subscription details
3. Run the generated script in Azure Cloud Shell
4. Grant admin consent for MS Graph (the one step the script cannot do — see Step 4 below)

---

### Path B — Advanced Configuration (Manual / AD Integration)

Use this when you need full control — e.g., existing App Registration, specific naming conventions, IaC pipelines, or restricted environments.

**Console**: Settings → Integrations → Cloud accounts → + Add New → Microsoft Azure → **Advanced configuration**

Follow the manual steps below.

---

## Step Order & Dependencies (Advanced / Manual Path)

```
[1] Create App Registration  ──┐
                               ├──► [2] Create Client Secret
                               └──► [3] Grant Directory Reader (Entra ID)
                                         │
                                         └──► [4] Grant Admin Consent (MS Graph)
                                                    │
[Parallel with 3-4] Assign RBAC Roles ─────────────┤
                                                    │
                                         [5] Create FortiCNAPP Integration
                                                    │
                                         [6] Validate
```

---

## Step 1 — Create App Registration *(no dependencies)*

- Entra admin center → **Identity → App registrations → + New registration**
- Name: `FortiCNAPP SA Audit`
- Account type: **Single tenant only**
- Save the **Application (client) ID** and **Directory (tenant) ID**

---

## Step 2 — Create Client Secret *(depends on Step 1)*

- App Registration → **Certificates & secrets → + New client secret**
- Max expiry: 2 years — set a calendar reminder
- Copy the **secret value immediately** (shown once only)
- Store in Azure Key Vault

---

## Step 3 — Assign RBAC Roles to the Service Principal *(depends on Step 1)*

| Role | Scope | Purpose |
|---|---|---|
| **Reader** | Management Group (preferred) or per Subscription | Reads all resource configs + `Microsoft.Authorization/*` for RBAC posture |
| **Security Reader** | Per Subscription | Defender for Cloud data |
| **Key Vault Reader** | Per Subscription | Key Vault compliance assessments |

> CIEM specifically relies on `Microsoft.Authorization/*` — covered by **Reader**.
> No write roles needed or wanted.

---

## Step 4 — Grant Directory Reader Entra ID Role *(depends on Step 1 — critical for CIEM)*

> **Note**: This step applies to **both paths** — the Guided Configuration wizard cannot grant admin consent automatically. You must do this manually even after running the generated script.

1. Entra admin center → **Roles & administrators → Directory Reader**
2. **+ Add assignments** → search `FortiCNAPP SA Audit` → Add
3. Grant MS Graph API admin consent:

```bash
az ad app permission admin-consent --id <application-id>
```

Or via portal: App Registration → **API permissions → Grant admin consent for [tenant]**

### MS Graph Permissions Unlocked

| Permission | Purpose |
|---|---|
| `Directory.Read.All` | Read all directory objects |
| `User.Read.All` | Enumerate users for IAM analysis |
| `Group.Read.All` | Enumerate group memberships |

> **Pitfall**: Without admin consent the integration stays **PENDING** even with Directory Reader assigned.

---

## Step 5 — Create FortiCNAPP Configuration Integration *(Advanced path only — depends on Steps 1–4)*

FortiCNAPP console → **Settings → Integrations → Cloud Accounts → + Add New → Azure → Advanced configuration**

Enter:
- Tenant ID
- Client ID (Application ID)
- Client Secret

Enable "Monitor All Subscriptions" or select specific ones.

---

## Step 6 — Validate *(allow 30–60 min after Step 5)*

- **Cloud Security → Resources** — Azure identities visible
- **Identity Security** (CIEM section) — shows overprivileged identities, unused permissions
- CLI check:

```bash
lacework compliance azure get-report <tenant-id>
```

---

## Role → CIEM Capability Mapping

| Role/Permission | What FortiCNAPP can assess |
|---|---|
| **Reader** | RBAC role assignments across all resources, who has what permissions |
| **Directory Reader** + MS Graph | Entra users, groups, app registrations, stale accounts |
| **Security Reader** | Defender for Cloud identity findings |
| **Key Vault Reader** | Key Vault config compliance |

> If **Directory Reader** is missing: CIEM shows partial data only — RBAC assignments visible but not Entra ID user/group objects. CIS/NIST identity controls show "Could Not Assess".

---

## Key Pitfalls

- Directory Reader is an **Entra ID role**, not Azure RBAC — assigned in Entra admin center, not subscription IAM
- Admin consent must be granted separately after role assignment
- Never assign Contributor, Owner, or any write-capable role
- Client secret expiry causes integration outages — rotate before expiry
