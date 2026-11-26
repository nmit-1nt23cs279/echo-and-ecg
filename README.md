# Hridaya Medha – Multimodal Cardiac Assessment Platform

<p align="center">
  <strong>An AI-powered web application for cardiac assessment using ECG and ECHO data</strong>
</p>

<p align="center">
  <a href="https://Hridaya Medha.vercel.app">Live Demo</a> ·
  <a href="https://github.com/bhavashyacy2005-droid/github-ready-health-app">Source Code</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Project-Final%20Year%20Project-blue" alt="Final Year Project">
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-61DAFB" alt="Frontend">
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E" alt="Supabase">
  <img src="https://img.shields.io/badge/Deployment-Vercel-black" alt="Vercel">
</p>

---

## 1. Overview

**Hridaya Medha** is a web-based multimodal cardiac assessment platform developed as a final-year B.Tech Computer Science and Engineering project.

The platform explores the use of Artificial Intelligence (AI) and Deep Learning to process two different types of cardiac data:

- **Electrocardiogram (ECG):** Signal-based cardiac data used for ECG classification.
- **Echocardiogram (ECHO):** Image-based cardiac data used for image classification.

The project implements separate deep-learning pipelines for ECG and ECHO analysis and integrates feature-level fusion to combine the extracted representations into a unified feature vector.

Hridaya Medha also provides a web interface for user authentication, data submission, assessment results, assessment history, PDF report generation, and professional review workflows.

The application is designed as an academic prototype to demonstrate multimodal data processing, machine-learning integration, and full-stack web application development.

## 2. Problem Statement

Cardiac assessment can involve different forms of medical data, including ECG signals and echocardiographic images. Handling these modalities independently can limit the ability to explore relationships between different types of cardiac information.

The project addresses this problem by developing a unified web-based platform that integrates ECG and ECHO processing workflows and provides a structured interface for accessing assessment information.

The proposed system combines modality-specific deep-learning models with a feature-level fusion approach to bring together information extracted from both modalities.

## 3. Project Objectives

- Develop a web-based platform for multimodal cardiac assessment.
- Implement a deep-learning model for ECG signal classification.
- Develop a CNN-based model for ECHO image classification.
- Extract meaningful feature representations from both modalities.
- Implement feature-level fusion of ECG and ECHO representations.
- Provide secure user registration and authentication.
- Store assessment information and maintain user assessment history.
- Generate downloadable PDF assessment reports.
- Provide a professional review interface.
- Deploy the application using a cloud-based hosting platform.

## 4. Key Features

| Feature | Description |
|---|---|
| User Authentication | Registration and login using Supabase Authentication. |
| User Profile | Manage and access user profile information. |
| ECG Assessment | Process ECG input using the ECG deep-learning pipeline. |
| ECHO Assessment | Process ECHO images using the image-classification pipeline. |
| Feature Extraction | Extract numerical feature representations from both modalities. |
| Multimodal Feature Fusion | Combine ECG and ECHO feature representations into a unified vector. |
| Results Dashboard | Present assessment outputs through the web interface. |
| Assessment History | Access previously stored assessment records. |
| PDF Report | Generate downloadable assessment reports. |
| Professional Dashboard | Provide an interface for professional review and recommendations. |
| Data Security | Use Supabase Row Level Security (RLS) to control database access. |
| Cloud Deployment | Host the frontend application on Vercel. |

## 5. System Architecture

Hridaya Medha follows a modular architecture consisting of a presentation layer, application processing layer, machine-learning processing components, and backend data services.

### High-Level Architecture

```text
                USERS
                  |
          Web Browser Interface
                  |
          React + TypeScript
                  |
          Hridaya Medha Platform
                  |
       +----------+-----------+
       |                      |
   ECG Processing         ECHO Processing
       |                      |
    1D-CNN                  2D-CNN
       |                      |
  ECG Features           ECHO Features
    (64)                    (128)
       |                      |
       +----------+-----------+
                  |
           Feature Fusion
                  |
        192-Dimensional Vector
                  |
          Assessment Interface
                  |
       +----------+-----------+
       |                      |
  Results and History    PDF Reports
       |
  Supabase Services
       |
  Authentication + PostgreSQL
```

### Main Architectural Components

1. **Presentation Layer:** React, TypeScript, and Tailwind CSS provide the user interface.
2. **Application Layer:** Handles user interactions, input workflows, result presentation, and application functionality.
3. **Machine-Learning Layer:** Contains the ECG and ECHO model-processing workflows and feature extraction components.
4. **Fusion Layer:** Combines the extracted ECG and ECHO feature representations into a unified representation.
5. **Backend Services:** Supabase provides authentication and PostgreSQL database services.
6. **Deployment Layer:** Vercel hosts the frontend application.

## 6. Machine Learning Methodology

The machine-learning component uses separate convolutional neural networks for processing ECG signals and ECHO images. The extracted features are then combined through a multimodal feature-fusion workflow.

### 6.1 ECG Classification – 1D CNN

The ECG classification model uses a one-dimensional convolutional neural network to process ECG signal features.

**Dataset and preprocessing**

- Number of samples: 4,998
- Number of input features: 140
- Training samples: 3,998
- Testing samples: 1,000
- Train-test split: 80:20

**Model architecture**

```text
Input ECG Data
      |
Conv1D – 32 Filters
      |
MaxPooling1D
      |
Conv1D – 64 Filters
      |
MaxPooling1D
      |
Flatten
      |
Dense – 64 (ReLU)
      |
Dropout – 0.3
      |
Dense – 1 (Sigmoid)
      |
Classification Output
```

**Training configuration**

| Parameter | Value |
|---|---|
| Model | 1D CNN |
| Optimizer | Adam |
| Loss Function | Binary Crossentropy |
| Epochs | 15 |
| Batch Size | 32 |
| Validation Split | 20% |
| Classification Threshold | 0.5 |

**Recorded ECG model results**

| Metric | Result |
|---|---:|
| Accuracy | 99.00% |
| Precision | 99.65% |
| Recall | 98.63% |
| F1-Score | 99.14% |

The ECG feature extractor produces a 64-dimensional feature representation.

### 6.2 ECHO Classification – 2D CNN

The ECHO classification model uses a two-dimensional convolutional neural network to process echocardiographic images.

**Dataset and preprocessing**

- Number of images: 2,405
- Image dimensions: 224 × 224 × 3
- Training images: 1,924
- Testing images: 481
- Train-test split: 80:20

**Classification categories**

1. Angina Disease
2. Hypotension Disease
3. Cardiovascular Disease
4. Coronary Artery Disease

**Model architecture**

```text
Input ECHO Image
      |
Conv2D – 32 Filters
      |
MaxPooling2D
      |
Conv2D – 64 Filters
      |
MaxPooling2D
      |
Conv2D – 128 Filters
      |
MaxPooling2D
      |
Flatten
      |
Dense – 128 (ReLU)
      |
Dropout – 0.3
      |
Dense – 4 (Softmax)
      |
Classification Output
```

**Training configuration**

| Parameter | Value |
|---|---|
| Model | 2D CNN |
| Optimizer | Adam |
| Loss Function | Sparse Categorical Crossentropy |
| Epochs | 15 |
| Input Size | 224 × 224 × 3 |
| Number of Classes | 4 |

**Recorded ECHO model results**

| Metric | Result |
|---|---:|
| Accuracy | 92.93% |
| Precision | 93.88% |
| Recall | 92.93% |
| F1-Score | 92.97% |

**Class-wise performance**

| Class | Precision | Recall | F1-Score |
|---|---:|---:|---:|
| Angina Disease | 1.00 | 0.88 | 0.94 |
| Hypotension Disease | 0.92 | 0.97 | 0.95 |
| Cardiovascular Disease | 1.00 | 0.86 | 0.92 |
| Coronary Artery Disease | 0.83 | 1.00 | 0.91 |

The ECHO feature extractor produces a 128-dimensional feature representation.

### 6.3 Multimodal Feature Fusion

The multimodal feature-fusion component combines the representations obtained from the ECG and ECHO models.

Instead of processing the two modalities independently at the final feature representation stage, the fusion workflow brings their extracted features together to form a unified representation.

**Feature representation**

| Modality | Feature Dimensions |
|---|---:|
| ECG Features | 64 |
| ECHO Features | 128 |
| Combined Feature Vector | 192 |

The extracted features are concatenated to form a 192-dimensional vector.

**Fusion network architecture**

```text
ECG Features (64)
       |
       +------ Concatenation
       |              |
ECHO Features (128)   |
                      |
              192-Dimensional Input
                      |
               Dense – 128 (ReLU)
                      |
                 Dropout 0.3
                      |
                Dense – 64 (ReLU)
                      |
                 Dropout 0.2
                      |
                Sigmoid Output
```

**Fusion workflow**

1. ECG input is processed through the 1D CNN.
2. ECHO input is processed through the 2D CNN.
3. The ECG model extracts a 64-dimensional feature representation.
4. The ECHO model extracts a 128-dimensional feature representation.
5. Both feature representations are concatenated.
6. The resulting 192-dimensional vector is passed through the fusion network.
7. The fusion workflow produces its output representation.

The fusion component integrates information from both modalities and forms an important part of the Hridaya Medha architecture.

## 7. Technology Stack

| Category | Technology |
|---|---|
| Frontend | React |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Authentication | Supabase Auth |
| Database | PostgreSQL |
| Backend Services | Supabase |
| Machine Learning | Python, TensorFlow, Keras |
| ECG Model | 1D CNN |
| ECHO Model | 2D CNN |
| Version Control | Git |
| Source Code Hosting | GitHub |
| Deployment | Vercel |

## 8. Application Modules

### User Authentication
Provides registration and login functionality through Supabase Authentication.

### User Dashboard
Provides access to the application's main assessment features and user-specific information.

### ECG Assessment
Accepts ECG-related input and connects it to the ECG processing workflow.

### ECHO Assessment
Provides an interface for submitting echocardiographic images for processing.

### Assessment Results
Displays the generated assessment outputs through the application interface.

### Assessment History
Provides access to previously stored assessment records.

### PDF Report Generation
Allows assessment information to be generated as a downloadable PDF report.

### Professional Review
Provides a dashboard for professional review, comments, and recommendations.

## 9. Database and Data Management

Hridaya Medha uses Supabase as its backend service and PostgreSQL as its relational database.

The database layer supports user information, authentication-related application workflows, assessment records, and professional review information.

**Important database concepts**

- User profiles and account information.
- Assessment and prediction records.
- Professional review information.
- User-specific data access.
- Row Level Security policies.

Row Level Security (RLS) is used to enforce access restrictions at the database level.

## 10. Repository Structure

The repository contains the frontend application and supporting project resources.

```text
Hridaya Medha/
│
├── public/
│   └── models/
│       ├── ecg/
│       └── echo/
│
├── src/
│   ├── components/
│   │   └── results.tsx
│   │
│   ├── lib/
│   │   └── browser-inference.ts
│   │
│   └── ...
│
├── supabase/
│   └── ...
│
├── package.json
├── package-lock.json
├── README.md
└── ...
```

*The structure above highlights the main directories discussed in the project. Update it to match the exact files and folders present in the final repository.*

## 11. Installation and Setup

Follow these steps to run the project locally.

### Prerequisites

Install the following tools:

- Node.js (LTS version recommended)
- npm
- Git
- A Supabase account
- A code editor such as Visual Studio Code

### Step 1: Clone the Repository

```bash
(https://github.com/nmit-1nt23cs279/echo-and-ecg.git)
```

### Step 2: Navigate to the Project Directory

```bash
cd github-ready-health-app
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root.

Add the Supabase configuration using the environment variable names expected by the application.

Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the placeholder values with your own Supabase project credentials.

**Security note:** Never commit private keys, service-role keys, passwords, or other secrets to GitHub. Use the appropriate environment variables in local development and Vercel deployment settings.

### Step 5: Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal to access the application.

### Step 6: Build for Production

```bash
npm run build
```

Use the production build output to verify that the frontend compiles successfully.

*Note: These commands assume the repository uses the standard Vite scripts. Check `package.json` for the exact available scripts before running them.*

## 12. Deployment

The Hridaya Medha frontend is deployed using **Vercel**.

### Deployment Workflow

1. Push the latest source code to the GitHub repository.
2. Import the GitHub repository into Vercel.
3. Configure the required build settings.
4. Add the Supabase environment variables in Vercel project settings.
5. Deploy the application.
6. Verify the deployed application and its Supabase connectivity.

### Deployment Architecture

| Component | Platform | Responsibility |
|---|---|---|
| Frontend Hosting | Vercel | Hosts and serves the web application |
| Source Code | GitHub | Stores and manages project source code |
| Authentication | Supabase Auth | Handles user authentication |
| Database | Supabase PostgreSQL | Stores application records |
| Access Control | Supabase RLS | Enforces database access policies |

**Live Application:** https://Hridaya Medha.vercel.app

## 13. Testing and Validation

Testing is important to verify the functionality, reliability, and integration of the application.

The project validation can be organized into the following categories:

| Testing Category | Validation Objective |
|---|---|
| Authentication Testing | Verify registration and login workflows |
| UI Testing | Verify navigation, forms, and dashboard components |
| ECG Model Testing | Evaluate ECG classification performance |
| ECHO Model Testing | Evaluate ECHO image classification performance |
| Feature Extraction Testing | Verify the dimensions of extracted feature representations |
| Fusion Workflow Testing | Verify concatenation and processing of ECG and ECHO features |
| Database Testing | Verify storage and retrieval of application records |
| Report Testing | Verify PDF report generation |
| Deployment Testing | Verify application accessibility through Vercel |

### Model Validation Summary

The individual ECG and ECHO models were evaluated using held-out test datasets.

| Model | Test Samples | Accuracy |
|---|---:|---:|
| ECG 1D CNN | 1,000 | 99.00% |
| ECHO 2D CNN | 481 | 92.93% |

These results represent the individual model experiments and should not be interpreted as clinical performance or as the accuracy of a jointly evaluated multimodal fusion model.

## 14. Limitations

- The project is an academic prototype and is not a clinically validated medical device.
- Model performance depends on the quality, distribution, and representativeness of the datasets.
- The reported ECG and ECHO metrics are based on the specific experimental datasets and train-test splits used.
- Further validation using larger and more diverse datasets is required to establish the generalizability of the models.
- The system should not be used as a substitute for professional medical diagnosis or treatment.

## 15. Future Enhancements

- Validate the implemented multimodal fusion model using larger and more diverse datasets.
- Improve model generalization and robustness.
- Add explainable AI techniques to make model outputs easier to interpret.
- Introduce additional cardiac data modalities where appropriate.
- Improve the professional review and reporting workflows.
- Conduct more extensive application security and usability testing.
- Explore integration with validated clinical systems, subject to appropriate approvals and standards.

## 16. Project Team

**Project Title:** Hridaya Medha – Multimodal Cardiac Assessment Platform

**Department:** Computer Science and Engineering

**Institution:** Nitte Meenakshi Institute of Technology, Bengaluru

**Academic Year:** 2026–2027

| Sl. No. | Team Member Name | USN |
|---:|---|---|
| 1 | S Harshit Sai | 1NT23CS203 |
| 2 | Y Bhavashya Chandra | 1NT23CS278 |
| 3 | Y Himabindhu | 1NT23CS279 |
| 4 | Y Kushi Reddy | 1NT23CS277 |

## 17. References and Resources

The following technologies and documentation resources are relevant to the implementation:

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TensorFlow Documentation](https://www.tensorflow.org/learn)
- [Keras Documentation](https://keras.io/)
- [Vercel Documentation](https://vercel.com/docs)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Documentation](https://docs.github.com/)

Dataset references and research papers used for model development should also be listed here with their original publication or dataset links.

## 18. Disclaimer

Hridaya Medha is developed strictly for educational, academic, and research demonstration purposes. It is not intended to provide medical diagnosis, treatment recommendations, or emergency medical advice.

The model outputs are experimental and must not be used for real-world clinical decision-making. Any actual medical concern should be evaluated by a qualified healthcare professional.

## 19. License

This project is developed as an academic final-year project.

A license has not been specified. If the project is intended to be reused or distributed publicly, add an appropriate license after obtaining agreement from the project team and institution.

---

<p align="center">
  <strong>Hridaya Medha</strong><br>
  Multimodal Intelligence for Cardiac Assessment
</p>
