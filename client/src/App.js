import { useEffect, useRef, useState } from "react";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const bottomRef = useRef(null);

  const API_URL =
    "https://gen-ai-app-nq57.onrender.com";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // -------------------------
  // PDF Upload
  // -------------------------
  const uploadPDF = async () => {
    if (!file) {
      setUploadStatus(
        "Choose a PDF first"
      );
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    setUploadStatus(
      "Uploading PDF..."
    );

    try {
      const res =
        await fetch(
          `${API_URL}/upload-pdf`,
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      let data;

      try {
        data =
          await res.json();
      } catch {
        throw new Error(
          "Server response invalid"
        );
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Upload failed"
        );
      }

      setUploadStatus(
        `✅ Ready (${data.chunks || 0
        } chunks indexed)`
      );

      setFile(null);
    } catch (err) {
      console.error(
        "UPLOAD ERROR:",
        err
      );

      setUploadStatus(
        `❌ ${err.message}`
      );
    }
  };

  // -------------------------
  // Ask AI
  // -------------------------
  const ask = async () => {
    if (!input.trim())
      return;

    const question =
      input;

    setMessages(
      (prev) => [
        ...prev,
        {
          type:
            "user",
          text:
            question,
        },
      ]
    );

    setInput("");
    setLoading(true);

    try {
      const res =
        await fetch(
          `${API_URL}/chat`,
          {
            method:
              "POST",
            headers:
              {
                "Content-Type":
                  "application/json",
              },
            body:
              JSON.stringify(
                {
                  message:
                    question,
                }
              ),
          }
        );

      let data;

      try {
        data =
          await res.json();
      } catch {
        throw new Error(
          "Server response invalid"
        );
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Chat failed"
        );
      }

      setMessages(
        (prev) => [
          ...prev,
          {
            type:
              "ai",
            text:
              data.response,
            sources:
              data.sources ||
              [],
          },
        ]
      );
    } catch (err) {
      console.error(
        "CHAT ERROR:",
        err
      );

      setMessages(
        (prev) => [
          ...prev,
          {
            type:
              "ai",
            text: `❌ ${err.message}`,
          },
        ]
      );
    }

    setLoading(false);
  };

  return (
    <div style={styles.shell}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          PDF Mind
        </div>

        <div
          style={
            styles.uploadArea
          }
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(
              e
            ) =>
              setFile(
                e.target
                  .files[0]
              )
            }
            style={
              styles.fileInput
            }
          />

          <button
            onClick={
              uploadPDF
            }
            style={
              styles.uploadBtn
            }
          >
            Upload
          </button>

          {uploadStatus && (
            <span
              style={
                styles.status
              }
            >
              {
                uploadStatus
              }
            </span>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div style={styles.stream}>
        {messages.length ===
          0 && (
          <div
            style={
              styles.emptyState
            }
          >
            Upload a PDF and ask
            anything.
          </div>
        )}

        {messages.map(
          (m, i) => (
            <div
              key={i}
              style={
                styles.block
              }
            >
              {m.type ===
              "user" ? (
                <div
                  style={
                    styles.userLine
                  }
                >
                  ›{" "}
                  {m.text}
                </div>
              ) : (
                <div
                  style={
                    styles.aiBlock
                  }
                >
                  <div
                    style={
                      styles.aiText
                    }
                  >
                    {
                      m.text
                    }
                  </div>

                  {m
                    .sources
                    ?.length >
                    0 && (
                    <div
                      style={
                        styles.sources
                      }
                    >
                      {m.sources.map(
                        (
                          s,
                          idx
                        ) => (
                          <span
                            key={
                              idx
                            }
                            style={
                              styles.source
                            }
                          >
                            {typeof s ===
                            "object"
                              ? s.name
                              : s}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {loading && (
          <div
            style={
              styles.thinking
            }
          >
            Thinking through
            document...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div
        style={
          styles.commandBar
        }
      >
        <input
          value={input}
          onChange={(
            e
          ) =>
            setInput(
              e.target
                .value
            )
          }
          placeholder="Ask your document..."
          style={
            styles.input
          }
          onKeyDown={(
            e
          ) => {
            if (
              e.key ===
              "Enter"
            ) {
              ask();
            }
          }}
        />

        <button
          onClick={ask}
          style={
            styles.askBtn
          }
        >
          Run
        </button>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    height: "100vh",
    background: "#0b0c0f",
    color: "#e5e7eb",
    fontFamily:
      "Arial, sans-serif",
    display: "flex",
    flexDirection:
      "column",
  },

  topBar: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    padding:
      "16px 24px",
    borderBottom:
      "1px solid #1f2937",
  },

  brand: {
    fontSize: 18,
    fontWeight: "600",
  },

  uploadArea: {
    display: "flex",
    alignItems:
      "center",
    gap: 10,
  },

  fileInput: {
    color: "#9ca3af",
    fontSize: 12,
  },

  uploadBtn: {
    background:
      "#1f2937",
    border:
      "1px solid #374151",
    color: "white",
    padding:
      "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },

  status: {
    fontSize: 12,
    color: "#9ca3af",
  },

  stream: {
    flex: 1,
    overflowY: "auto",
    padding: "30px",
    display: "flex",
    flexDirection:
      "column",
    gap: 18,
  },

  emptyState: {
    textAlign:
      "center",
    opacity: 0.45,
    marginTop: 120,
  },

  block: {
    maxWidth: "850px",
  },

  userLine: {
    fontSize: 15,
    color: "#d1d5db",
  },

  aiBlock: {
    borderLeft:
      "2px solid #1f2937",
    paddingLeft: 14,
  },

  aiText: {
    fontSize: 15,
    lineHeight: 1.7,
    whiteSpace:
      "pre-wrap",
  },

  sources: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  source: {
    fontSize: 11,
    border:
      "1px solid #374151",
    padding:
      "4px 8px",
    borderRadius: 999,
  },

  thinking: {
    opacity: 0.5,
  },

  commandBar: {
    borderTop:
      "1px solid #1f2937",
    padding: 20,
    display: "flex",
    gap: 10,
  },

  input: {
    flex: 1,
    background:
      "#111827",
    border:
      "1px solid #374151",
    borderRadius: 12,
    padding:
      "14px 16px",
    color: "white",
    outline: "none",
  },

  askBtn: {
    background:
      "#1f2937",
    border:
      "1px solid #374151",
    color: "white",
    padding:
      "0 20px",
    borderRadius: 12,
    cursor: "pointer",
  },
};

export default App;