# Nextflow Pipeline Builder 🚀

[](https://eclectic-macaron-6eb243.netlify.app/)

**Live Demo:** [https://eclectic-macaron-6eb243.netlify.app/](https://eclectic-macaron-6eb243.netlify.app/)

## 🌟 Introduction

Welcome to the Nextflow Pipeline Builder\! This is an interactive web application designed to help you build [Nextflow](https://www.nextflow.io/) pipeline configurations and generate the necessary `main.nf` and `nextflow.config` files.

What makes this tool special is its integration with Google's Gemini AI. It can suggest entire pipeline structures, individual process scripts, and workflow logic based on your descriptions, significantly speeding up the development process.

***Disclaimer:*** *This project was primarily built using the AI Studio tool from Google as an experiment to explore AI-driven development. It's a fun trial of new technologies\!*

## ✨ Features

  * **Interactive UI:** A user-friendly interface to define all aspects of your pipeline.
  * **Pipeline Setup:** Define basic information like name, description, and version.
  * **Parameter Management:** Add, edit, and delete pipeline parameters (string, integer, boolean, path, etc.).
  * **Process Creation:** Define Nextflow processes with inputs, outputs, directives, and scripts. Includes pre-built templates for common tasks (e.g., FASTQC, BWA-MEM).
  * **Workflow Definition:** Build the logic of your pipeline by connecting processes.
  * **Configuration:** Add custom settings to your `nextflow.config` file.
  * **Live Preview:** See the generated `main.nf` and `nextflow.config` code as you build.
  * **Workflow Visualizer:** Get a visual representation of your pipeline's structure.
  * **AI-Powered Suggestions (Gemini):**
      * **AI Pipeline Genie:** Generate a full pipeline structure (parameters, processes, workflow) from a high-level goal.
      * **Process Suggester:** Get AI suggestions for process scripts, inputs, and outputs based on a task description.
      * **Workflow Suggester:** Get AI suggestions for the workflow block based on your pipeline goal and defined processes.

## 🛠️ Tech Stack

  * **Frontend:** React, TypeScript
  * **Styling:** TailwindCSS
  * **AI:** Google Gemini API (@google/genai)
  * **Build Tool:** Vite
  * **Deployment:** Netlify

## 🚀 Getting Started

Follow these steps to run the Nextflow Pipeline Builder locally:

**Prerequisites:**

  * [Node.js](https://nodejs.org/) (v18 or higher recommended)
  * [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd nextflow-pipeline-builder
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```
3.  **Set up Environment Variables (for AI Features):**
      * Copy the `.env.example` file (if one exists) or create a new file named `.env.local`.
      * Add your Google Gemini API key to this file:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```
      * **Note:** If you don't provide an API key, the application will run, but the AI-powered features will be disabled.

**Running Locally:**

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
2.  Open your browser and navigate to the local address provided (usually `http://localhost:5173` or similar).

## 🤖 AI Integration (Gemini)

This application utilizes the Google Gemini API for several key features:

  * **`suggestFullNextflowPipeline`:** Takes a high-level description and attempts to generate a complete JSON structure representing a Nextflow pipeline. This includes parameters, process stubs, and a workflow.
  * **`suggestNextflowProcessParts`:** Given a description of a single task (e.g., "Align reads with BWA"), it suggests the `input`, `output`, `directive`, and `script` blocks for a Nextflow process.
  * **`suggestNextflowWorkflow`:** Based on a pipeline goal and the list of processes you've defined, it suggests how to connect them in the `workflow` block.

The integration is handled in `src/services/geminiService.ts`. It requires a `GEMINI_API_KEY` to function.

## 📦 Deployment

This application is deployed via Netlify. The deployment process is triggered by pushes to the main branch and uses the `npm run build` command. Netlify handles the hosting and makes the app available at: [https://eclectic-macaron-6eb243.netlify.app/](https://eclectic-macaron-6eb243.netlify.app/)

-----

Enjoy building your Nextflow pipelines\!
