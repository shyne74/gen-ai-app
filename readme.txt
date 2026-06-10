# PDF Mind 🧠📄

AI-powered PDF chatbot that lets users upload documents and chat with them using Retrieval-Augmented Generation (RAG).

## 🚀 Live Demo

Frontend: https://gen-ai-app-eight.vercel.app/

Backend API: https://gen-ai-app-nq57.onrender.com/

---

## ✨ Features

* Upload PDF documents
* Ask questions about uploaded PDFs
* AI-powered answers using RAG
* Semantic search with embeddings
* Source attribution
* Clean minimal chat UI
* Full-stack deployment

---

## 🛠 Tech Stack

### Frontend

* React.js
* JavaScript
* CSS (Inline Styling)

### Backend

* Node.js
* Express.js

### AI / RAG

* Groq API (Llama 3.3 70B)
* LangChain
* Xenova Transformers
* all-MiniLM-L6-v2 embeddings

### File Processing

* Multer
* PDF Parse

### Deployment

* Vercel (Frontend)
* Render (Backend)

---

## 🧠 How It Works

1. User uploads a PDF
2. PDF text gets extracted
3. Text is split into chunks
4. Embeddings are generated
5. Stored in local vector store
6. User asks a question
7. Relevant chunks are retrieved
8. Context is sent to LLM
9. AI returns grounded response

---

## 📸 Screenshots

(Add screenshots here)

---

## ⚙️ Installation

Clone repo:

```bash
git clone https://github.com/shyne74/gen-ai-app.git
```

Install frontend:

```bash
cd client
npm install
npm start
```

Install backend:

```bash
cd server
npm install
npm start
```

---

## 🔮 Future Improvements

* Multi-document support
* Chat memory
* Better retrieval ranking
* Vector database integration
* Citation previews

---

## 👨‍💻 Author

Yash Vardhan
