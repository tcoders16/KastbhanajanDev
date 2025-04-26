import { useState, useRef, useEffect } from 'react';
import './App.css'; // ← make sure to use the dark WhatsApp-style CSS we created

function getYouTubeVideoID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAsk = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setChatHistory((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      });

      const data = await res.json();
      const hanumanMessage = { sender: 'hanuman', text: data.reply, youtube: data.youtube };
      setChatHistory((prev) => [...prev, hanumanMessage]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory((prev) => [...prev, { sender: 'hanuman', text: '❌ Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h1 className="title">
        जय श्रीराम! <span className="text-red-500">🚩</span> Kastbhanjan Dev
      </h1>

      <div className="chat-box">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === 'user' ? 'user-message' : 'hanuman-message'}`}
          >
            <p>{msg.text}</p>
            {msg.youtube && getYouTubeVideoID(msg.youtube) && (
              <div style={{ marginTop: '10px' }}>
                <iframe
                  width="100%"
                  height="215"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoID(msg.youtube)}?autoplay=1&mute=1`}
                  title="YouTube video"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="hanuman-message message">
            ⏳ Hanumanji is preparing your answer...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Hanumanji something..."
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        />
        <button onClick={handleAsk}>Send</button>
      </div>
    </div>
  );
}

export default App;