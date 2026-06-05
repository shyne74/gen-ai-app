import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    setChat((prev) => [...prev, { role: "user", text: userMessage }]);
    setMessage("");
    setLoading(true);
    
try {
  const res = await fetch("https://gen-ai-app-nq57.onrender.com/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessage }),
  });

      const data = await res.json();
      console.log("BACKEND RESPONSE:", data);

      setChat((prev) => [
        ...prev,
        { role: "ai", text: data.response },
      ]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to server 😵" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚡ Yash AI Chat</h2>

      <div style={styles.chatBox}>
        {chat.map((c, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: c.role === "user" ? "flex-end" : "flex-start",
              background: c.role === "user" ? "#4f46e5" : "#222",
            }}
          >
            {c.text}
          </div>
        ))}

        {loading && <div style={styles.loading}>thinking... 🧠</div>}
      </div>

      <div style={styles.inputBox}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something..."
          style={styles.input}
        />

        <button onClick={sendMessage} style={styles.button}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0f0f0f",
    color: "white",
    padding: 20,
    fontFamily: "Arial",
  },
  title: {
    textAlign: "center",
  },
  chatBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflowY: "auto",
    padding: 10,
  },
  message: {
    padding: 10,
    borderRadius: 10,
    maxWidth: "60%",
  },
  inputBox: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
  },
  button: {
    padding: "10px 20px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  loading: {
    opacity: 0.6,
  },
};

export default App;