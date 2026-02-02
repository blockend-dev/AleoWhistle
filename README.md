# 🔒 AleoWhistle: Anonymous Whistleblowing System

**Built on Aleo Blockchain | Zero-Knowledge Privacy**

![Aleo Shield](https://img.shields.io/badge/Aleo-ZK_Privacy-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Hackathon-Project-orange)

## 🎯 Overview

AleoWhistle is a decentralized, anonymous whistleblowing system built on the Aleo blockchain. It enables secure, private reporting of misconduct while ensuring data integrity and transparency through zero-knowledge cryptography.

## ✨ Key Features

- 🔐 **Complete Anonymity**: Reporters remain anonymous using cryptographic identities
- 🛡️ **End-to-End Encryption**: Optional client-side encryption for sensitive reports
- 📊 **Transparent Governance**: Public metadata with private content
- 🔗 **Immutable Audit Trail**: All actions recorded on Aleo blockchain
- 👥 **Role-Based Access**: Admin and reviewer permissions
- ✅ **Integrity Verification**: Cryptographic proof of report authenticity

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Web/Mobile App] -->|ZK Proof Generation| B[Client SDK]
        B -->|Encrypted Submission| C[Aleo Wallet]
    end
    
    subgraph "Blockchain Layer"
        C --> D[Whistleblowing.aleo]
        
        subgraph "On-Chain Storage"
            D --> E[Reports Mapping]
            D --> F[Metadata Mapping]
            D --> G[Encrypted Content]
            D --> H[Admin/Reviewer Roles]
            D --> I[Statistics]
        end
    end
    
    subgraph "User Roles"
        J[Whistleblower] --> A
        K[Reviewer] --> A
        L[Admin] --> A
    end
    
    subgraph "Verification"
        M[Public] -->|View Metadata| F
        N[Authorized] -->|Access Encrypted| G
    end
    
    style A fill:#e1f5fe
    style D fill:#f3e5f5
    style J fill:#e8f5e8
    style K fill:#fff3e0
    style L fill:#ffebee
```

## 📊 Data Flow

```mermaid
sequenceDiagram
    participant W as Whistleblower
    participant C as Client App
    participant BC as Aleo Blockchain
    participant R as Reviewer
    
    W->>C: 1. Submit Report
    C->>C: Generate Anonymous ID
    C->>C: Hash & Encrypt Content
    C->>BC: 2. ZK Transaction
    BC->>BC: Store Metadata (Public)
    BC->>BC: Store Encrypted Content (Private)
    BC-->>C: Return Report ID
    
    R->>C: 3. Request Access
    C->>BC: Verify Permissions
    BC-->>C: Grant/Deny Access
    R->>BC: 4. Update Status
    BC->>BC: Update Metadata & Stats
    
    Note over W,R: Complete privacy preserved
```


## 🚀 Quick Start

### Prerequisites
- Aleo Leo CLI
- Node.js 22+
- Leo wallet / Sheild

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/blockend-dev/AleoWhistle.git
cd AleoWhistle
```

2. **Compile the contract**
```bash
leo build
```

3. **Deploy to testnet**
```bash
leo deploy
```

4. **Initialize the system**
```bash
leo run initialize
```
## 📖 Contract Functions

### Core Functions
| Function | Description | Access |
|----------|-------------|---------|
| `initialize()` | Initialize system | Admin |
| `submit_report()` | Submit anonymous report | Public |
| `update_status()` | Update report status | Admin/Reviewer |
| `add_reviewer()` | Add new reviewer | Admin |


## 🔐 Security Model

### Access Control
```mermaid
graph LR
    A[User] --> B{Check Role}
    B -->|Public| C[Submit Reports]
    B -->|Reviewer| D[View Encrypted Content]
    B -->|Reviewer| E[Update Status]
    B -->|Admin| F[Add Reviewers]
    B -->|Admin| G[System Configuration]
    
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#ffebee
    style G fill:#ffebee
```

## 📈 Statistics Tracking

The system maintains three counters:
- **Total Reports**: All submitted reports
- **Pending Reviews**: Reports under investigation
- **Resolved Cases**: Successfully addressed reports

## 🚧 Hackathon Extensions (Potential)

1. **IPFS Integration**: Store large evidence files off-chain
2. **Reputation System**: Verified whistleblower scores
3. **Multi-sig Escrow**: Reward mechanisms for valid reports
4. **Mobile App**: Cross-platform reporting
5. **AI Analysis**: Automated triaging of reports
6. **Anonymous Messaging**: Secure communication channel


## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

**Built with ❤️ on ALEO**