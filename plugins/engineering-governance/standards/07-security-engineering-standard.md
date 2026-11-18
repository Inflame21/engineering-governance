# SEC-007 — Security Engineering Standard

**Status:** Mandatory Engineering Standard  
**Applies to:** All software, services, APIs, infrastructure, data, and development workflows  
**Technology:** Technology-neutral  

---

## 1. Purpose

SEC-007 defines the minimum security engineering requirements for designing, building, reviewing, deploying, and operating software systems.

Security SHALL be treated as a system property rather than a final review activity.

> **Security is not a feature added after implementation. It is a set of constraints the system must satisfy throughout its lifecycle.**

## 2. Scope

SEC-007 governs:

- Security requirements and threat modeling
- Identity and authentication
- Authorization and access control
- Tenant and ownership isolation
- Input validation and output handling
- Injection prevention
- Secrets and credential management
- Cryptography and key management
- Sensitive-data handling
- Session and token security
- API and network security
- File and content security
- Dependency and supply-chain security
- Secure configuration
- Security logging and monitoring
- Vulnerability management
- Security testing
- Incident-related security controls
- AI-assisted development security

SEC-007 does not replace domain-specific requirements in BE-003, FE-004, DB-005, API-006, INFRA-013, OBS-014, or PRD-018.

## 3. Security Principles

All systems SHALL follow these principles:

- Least privilege
- Deny by default
- Explicit trust boundaries
- Server-side enforcement
- Minimize sensitive data
- Secure defaults
- Defense in depth
- Fail safely
- Validate at trust boundaries
- Do not trust client-controlled security decisions
- Secrets are credentials, not configuration data
- Security-relevant behavior must be observable
- Dependencies are part of the attack surface
- Security controls must be testable
- Security exceptions require explicit ownership and expiry

## 4. Security Readiness Preconditions

Security requirements SHALL be identified before implementation for systems handling:

- Authentication or identity
- Personal or sensitive information
- Financial or business-critical data
- Privileged operations
- Multi-tenant data
- External integrations
- File uploads
- Administrative capabilities
- Internet-accessible interfaces
- Secrets or credentials
- High-impact workflows

The team SHALL identify relevant assets, actors, trust boundaries, threats, controls, and failure consequences.

## 5. Asset Classification

Systems SHALL identify assets that require protection.

Examples include:

- Credentials and authentication tokens
- Personal information
- Financial information
- Business-confidential data
- Encryption keys
- Infrastructure credentials
- Source code
- Customer data
- Administrative capabilities
- Audit records

Data classification SHOULD define at least:

| Classification | Example | Expected treatment |
|---|---|---|
| Public | Public documentation | No special confidentiality control required |
| Internal | Internal operational information | Restricted to authorized users |
| Confidential | Business/customer data | Strong access and handling controls |
| Restricted | Credentials, keys, highly sensitive data | Strongest access, storage, and monitoring controls |

Classification SHALL drive storage, transmission, logging, retention, and access decisions.

## 6. Threat Modeling

Security-sensitive systems SHALL undergo threat modeling proportional to risk.

Threat modeling SHOULD identify:

- Assets
- Actors
- Trust boundaries
- Entry points
- Data flows
- Privileged operations
- Abuse cases
- Failure modes
- Security controls
- Residual risk

Relevant threat categories may include:

- Spoofing
- Tampering
- Repudiation
- Information disclosure
- Denial of service
- Elevation of privilege
- Injection
- Account takeover
- Abuse of business workflows

Threat models SHALL be updated when major architecture, trust-boundary, data, or authentication changes occur.

## 7. Trust Boundaries

Trust boundaries SHALL be explicit.

Common boundaries include:

- Browser to backend
- Mobile application to backend
- Public API to internal services
- Service to service
- Application to database
- Application to third-party provider
- User-controlled file to application
- CI/CD system to deployment environment

Crossing a trust boundary SHALL trigger appropriate validation, authentication, authorization, and data-handling controls.

## 8. Authentication

Authentication mechanisms SHALL be appropriate to the threat model and sensitivity of the system.

Authentication SHALL address:

- Credential protection
- Credential lifecycle
- Session/token lifecycle
- Failed-attempt behavior
- Account recovery
- Logout/revocation where applicable
- MFA where risk requires it
- Device/session management where applicable

Passwords SHALL NOT be stored in plaintext or reversibly encrypted form.

Authentication secrets and tokens SHALL have appropriate expiry, rotation, and revocation behavior.

Authentication success SHALL NOT imply authorization.

## 9. Authorization and Access Control

Authorization SHALL be enforced on the server or trusted backend boundary.

Access control SHALL consider:

- User identity
- Role or permission
- Resource ownership
- Tenant
- Organization
- Scope
- Operation
- Resource state

Authorization checks SHALL occur for every security-sensitive operation.

Client-side route guards and hidden UI controls are not security controls.

Access control SHOULD follow least privilege.

## 10. Multi-Tenancy and Isolation

Multi-tenant systems SHALL enforce tenant isolation server-side.

Every tenant-scoped operation SHALL establish the authoritative tenant context from a trusted source.

Client-supplied tenant identifiers SHALL NOT be trusted as authorization evidence.

Queries, caches, files, background jobs, events, and integrations SHALL be evaluated for cross-tenant leakage.

Tenant isolation SHALL be tested explicitly.

## 11. Input Validation

All externally controlled input SHALL be treated as untrusted.

Validation SHALL address:

- Type
- Format
- Length
- Range
- Encoding
- Allowed values
- Structural constraints
- Business constraints where applicable

Validation SHALL occur at trust boundaries.

Validation must not rely exclusively on frontend behavior.

## 12. Injection Prevention

Applications SHALL prevent injection into interpreters and execution contexts.

Relevant categories include:

- SQL injection
- NoSQL injection
- Command injection
- Template injection
- HTML injection
- Cross-site scripting
- LDAP injection
- Expression-language injection
- Path traversal
- Header injection
- Query manipulation

Parameterized queries, safe APIs, structured commands, context-aware output encoding, and allowlists SHOULD be preferred over string concatenation.

## 13. Output Encoding and Content Security

Output SHALL be encoded according to its destination context.

Applications rendering untrusted content SHALL consider:

- HTML escaping
- Attribute escaping
- JavaScript context safety
- URL safety
- Content Security Policy where applicable
- Safe handling of rich text

User-provided HTML SHALL NOT be rendered as trusted content without explicit sanitization and threat analysis.

## 14. Secrets and Credentials

Secrets SHALL NOT be committed to source control.

Secrets SHALL NOT be embedded in:

- Source code
- Frontend bundles
- Public configuration
- Container images
- Logs
- Error responses
- Documentation
- Test fixtures that may reach production

Secrets SHOULD be stored in an appropriate secret-management mechanism.

Secret handling SHALL include:

- Rotation
- Access control
- Scope limitation
- Revocation
- Exposure response

If a secret is exposed, assume compromise until proven otherwise and rotate/revoke it.

## 15. Cryptography

Cryptography SHALL use well-established algorithms and maintained libraries.

Teams SHALL NOT invent custom cryptographic algorithms or protocols.

Cryptographic design SHALL consider:

- Algorithm selection
- Key length
- Key storage
- Key rotation
- Key access
- Randomness
- Certificate lifecycle
- Data-at-rest protection
- Data-in-transit protection

Deprecated or intentionally weakened algorithms require explicit security review and documented justification.

## 16. Sensitive Data Handling

Systems SHALL minimize collection, exposure, storage, and retention of sensitive information.

Sensitive data SHALL be:

- Collected only when justified
- Accessible only to authorized parties
- Protected in transit
- Protected at rest where required
- Excluded from unnecessary logs
- Retained only as long as required
- Deleted according to defined lifecycle requirements

Sensitive data must not appear in URLs unless explicitly justified and reviewed.

## 17. Session and Token Security

Sessions and tokens SHALL have defined:

- Scope
- Lifetime
- Expiration
- Revocation behavior
- Storage mechanism
- Rotation behavior where required

Browser authentication mechanisms SHALL use appropriate protections against theft and cross-site attacks.

Tokens SHALL NOT contain sensitive information merely because they are encoded rather than encrypted.

Long-lived credentials SHOULD be avoided unless operationally necessary.

## 18. API and Network Security

APIs SHALL enforce authentication and authorization according to API-006 and SEC-007.

Network controls SHALL consider:

- Transport encryption
- TLS configuration
- Service identity
- Network segmentation
- Ingress exposure
- Egress controls
- Internal versus public endpoints
- Administrative interfaces

Administrative interfaces SHOULD NOT be unnecessarily exposed to public networks.

## 19. File and Content Security

File uploads SHALL be treated as hostile input.

Security controls SHOULD include:

- Size limits
- Content-type validation
- File signature/content validation
- Filename normalization
- Storage isolation
- Malware scanning where risk requires it
- Execution prevention
- Authorization on download

Uploaded files SHALL NOT automatically become executable content.

## 20. Dependency and Supply-Chain Security

Third-party dependencies are part of the application's attack surface.

Teams SHALL:

- Track dependencies
- Prefer maintained packages
- Review security advisories
- Remove unnecessary dependencies
- Avoid untrusted packages
- Lock dependency versions where appropriate
- Review transitive dependency risk

Build tooling and development dependencies SHALL also be considered where they can affect source, artifacts, credentials, or deployment.

Dependency upgrades SHALL be reviewed for security and compatibility impact.

## 21. Secure Configuration

Security-sensitive configuration SHALL use secure defaults.

Configuration SHALL NOT silently disable:

- Authentication
- Authorization
- TLS
- Input validation
- Audit logging
- Security headers
- Rate limits

Development conveniences that weaken security SHALL NOT reach production unintentionally.

Environment-specific security controls SHALL be explicit.

## 22. Browser and Frontend Security

Frontend applications SHALL consider:

- XSS
- CSRF where applicable
- Clickjacking
- Secure cookie attributes
- Token exposure
- Sensitive data in browser storage
- Dependency compromise
- Content Security Policy
- Safe URL handling

Sensitive authorization decisions SHALL remain server-side.

Frontend code is public and SHALL NOT contain secrets that must remain confidential.

## 23. Logging, Auditing, and Security Monitoring

Security-relevant actions SHOULD be auditable where business or regulatory risk requires it.

Examples include:

- Authentication events
- Authorization failures
- Privileged operations
- Permission changes
- Credential changes
- Security configuration changes
- Sensitive-data access
- Administrative actions

Security logs SHALL avoid exposing secrets, tokens, passwords, or unnecessary sensitive payloads.

Audit records SHOULD be protected against unauthorized modification.

## 24. Vulnerability Management

Known security vulnerabilities SHALL be assessed based on:

- Exploitability
- Exposure
- Affected asset
- Data sensitivity
- Privilege required
- Existing mitigations
- Business impact

Critical vulnerabilities affecting production exposure SHALL normally block release until remediated or formally excepted.

Security exceptions SHALL have an owner, rationale, compensating controls where applicable, and expiry.

## 25. Security Testing

Security testing SHALL be proportional to system risk.

Testing SHOULD include:

- Authentication tests
- Authorization tests
- Tenant-isolation tests
- Input-validation tests
- Injection tests
- Session/token tests
- File-upload tests
- Dependency scanning
- Secret scanning
- Static analysis
- Dynamic testing where appropriate
- Abuse-case testing

Security tests SHALL include negative cases, not only successful flows.

## 26. Incident Preparedness

Security-sensitive systems SHALL have enough telemetry and operational capability to support investigation.

The system should allow engineers to determine:

- Which identity performed an action
- When it occurred
- Which resource was affected
- Which request/session/correlation identifier was involved
- Relevant source or service context

Incident response procedures are governed further by INC-019.

## 27. AI-Assisted Development Security

AI-generated code SHALL be treated as untrusted code.

Reviewers SHALL specifically inspect AI-generated changes for:

- Authentication bypass
- Authorization bypass
- Secret leakage
- Unsafe deserialization
- Injection
- Insecure defaults
- Excessive permissions
- Data leakage
- Vulnerable dependencies
- Missing validation
- Missing security tests

Sensitive source code, credentials, customer data, private keys, or confidential material SHALL NOT be supplied to external AI systems unless the approved security and data-handling policy explicitly permits it.

AI-generated security advice is not security evidence.

## 28. Security Review Gate

Security review SHALL establish, where applicable:

- [ ] Assets identified
- [ ] Data classification completed
- [ ] Trust boundaries identified
- [ ] Threats assessed
- [ ] Authentication defined
- [ ] Authorization defined
- [ ] Tenant isolation defined
- [ ] Input validation defined
- [ ] Injection risks addressed
- [ ] Secrets management defined
- [ ] Cryptographic requirements addressed
- [ ] Sensitive-data handling defined
- [ ] Session/token security reviewed
- [ ] File security reviewed
- [ ] Dependency risks reviewed
- [ ] Secure configuration reviewed
- [ ] Security logging/auditing considered
- [ ] Vulnerability scanning completed where required
- [ ] Security testing completed where required
- [ ] Residual risks documented

| Decision | Meaning |
|---|---|
| **PASS** | No unresolved security issue prevents the intended progression |
| **PASS WITH CONDITIONS** | Progression allowed only with explicit compensating controls or deadlines |
| **FAIL** | Security risk requires remediation before progression |

## 29. Security Review Checklist

### Identity and Access
- [ ] Authentication is appropriate
- [ ] Authorization is server-enforced
- [ ] Least privilege is applied
- [ ] Privileged operations are protected
- [ ] Tenant/ownership isolation is enforced

### Data
- [ ] Sensitive data is classified
- [ ] Collection is minimized
- [ ] Storage and transmission are protected
- [ ] Retention is defined
- [ ] Sensitive data is absent from unnecessary logs

### Application
- [ ] Trust boundaries are explicit
- [ ] Input is validated
- [ ] Injection risks are addressed
- [ ] Output is safely encoded
- [ ] File uploads are treated as untrusted

### Secrets and Cryptography
- [ ] No secrets are committed
- [ ] Secret storage is appropriate
- [ ] Rotation/revocation exists where required
- [ ] Approved cryptography is used
- [ ] Keys are appropriately protected

### Dependencies and Supply Chain
- [ ] Dependencies are reviewed
- [ ] Vulnerability scanning is performed
- [ ] Unnecessary dependencies are removed
- [ ] Build/deployment tooling is considered

### Operations
- [ ] Security-relevant events are observable
- [ ] Audit requirements are satisfied
- [ ] Incident investigation is feasible
- [ ] Security configuration is explicit

## 30. Automatic Production Blockers

The following SHALL normally result in **NO-GO**:

- Hard-coded production credentials or secrets
- Authentication bypass
- Authorization bypass
- Cross-tenant data access
- Critical sensitive-data exposure
- Critical remotely exploitable vulnerability
- Known credential/token exposure without remediation
- Plaintext password storage
- Disabled or bypassable security controls in production
- Critical injection vulnerability
- Uncontrolled execution of untrusted uploaded content
- Security-critical behavior that cannot be audited where auditability is required
- Security exception without an owner, mitigation, and expiry

## 31. Security Exceptions

Security exceptions SHALL be explicit and temporary.

Every exception SHALL document:

- Requirement being excepted
- Business/technical justification
- Risk assessment
- Compensating controls
- Owner
- Approval
- Expiration date
- Remediation plan

Exceptions SHALL NOT become permanent substitutes for engineering work.

## 32. Change Control

Security impact SHALL be assessed when changes affect:

- Authentication
- Authorization
- Trust boundaries
- Sensitive data
- Cryptography
- Secrets
- External exposure
- Dependencies
- File handling
- Administrative capabilities
- Tenant isolation

Material security changes require security review before production approval.

## 33. Sign-Off

The responsible engineer confirms:

> “The system's security requirements, trust boundaries, access controls, sensitive-data handling, threat exposure, security testing, and residual risks have been reviewed and are appropriate for the intended environment.”

The reviewer confirms:

> “I have reviewed the system against SEC-007 and found no unresolved security issue that prevents the approved production decision.”

## 34. Final Principle

> **The absence of an observed vulnerability is not evidence that a system is secure. Security requires deliberate controls, adversarial thinking, and evidence that those controls work.**