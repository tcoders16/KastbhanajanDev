import { useState, useRef, useEffect } from 'react';
import './App.css';

// Helper to extract YouTube video ID
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

  // Scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAsk = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setChatHistory((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: input })
      });

      const data = await res.json();

      const hanumanMessage = {
        sender: 'hanuman',
        text: data.reply,
        youtube: data.youtube
      };

      setChatHistory((prev) => [...prev, hanumanMessage]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory((prev) => [...prev, { sender: 'hanuman', text: '❌ Something went wrong.' }]);
    } finally {
      setInput('');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-4">
      {/* Heading */}
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
        जय श्रीराम! 🚩 Kastbhanjan Dev Chat
      </h1>

      {/* Chat Box */}
      <div className="w-full max-w-2xl flex flex-col bg-gray-50 border rounded-lg shadow-md h-[70vh] overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[85%] whitespace-pre-line ${
              msg.sender === 'user'
                ? 'bg-yellow-100 self-end text-right'
                : 'bg-white border self-start'
            }`}
          >
            {/* Message Text */}
            <p>{msg.text}</p>

            {/* If there is a YouTube link, show embedded video */}
            {msg.youtube && getYouTubeVideoID(msg.youtube) && (
              <div className="mt-3">
                <iframe
                  width="100%"
                  height="215"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoID(msg.youtube)}?autoplay=1&mute=1`}
                  title="YouTube video"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="rounded-lg shadow-lg"
                ></iframe>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-gray-500 italic text-sm">⏳ Hanumanji is preparing your answer...</div>
        )}

        {/* Auto scroll anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* Input + Ask Button */}
      <div className="w-full max-w-2xl flex mt-4 space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Hanumanji something..."
          className="flex-grow p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        />
        <button
          onClick={handleAsk}
          className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold px-6 rounded-lg"
        >
          🙏 Ask
        </button>
      </div>
    </div>
  );
}

export default App;