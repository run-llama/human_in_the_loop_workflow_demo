"use client";
import { useState, useEffect } from 'react';
import styles from './page.module.css';  // Add this import

declare global {
  interface Window {
    socket?: WebSocket;
  }
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<string[]>([]);
  const [responseRequired, setResponseRequired] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up WebSocket connection if component unmounts
      if (window.socket) {
        window.socket.close();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProgress([]); // Clear previous progress
    const socket = new WebSocket('ws://localhost:8000/query');

    socket.onopen = () => {
      socket.send(JSON.stringify({ question: query }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
      if (data.type === 'progress') {
        setProgress(prev => [...prev, data.payload]);
      } else if (data.type === 'input_required') {
        setProgress(prev => [...prev, data.payload]);
        setResponseRequired(true);
      } else if (data.type === 'final_result') {
        setProgress(prev => [...prev, `Final result: ${data.payload}`]);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setProgress(prev => [...prev, `Error: ${error}`]);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setProgress(prev => [...prev, 'Connection closed']);
    };

    // Store the socket in the window object for cleanup
    window.socket = socket;
  };

  const handleResponse = (response: 'yes' | 'no') => {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ response }));
      setResponseRequired(false);
    } else {
      console.error('WebSocket is not connected');
      setProgress(prev => [...prev, 'Error: WebSocket is not connected']);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Query</button>
      </form>
      <div id="progress" className={styles.progress}>
        <h2>Progress:</h2>
        {progress.map((message, index) => (
          <div key={index} className={styles.message}>
            <p>{message}</p>
            {responseRequired && index === progress.length - 1 && (
              <div className={styles.responseButtons}>
                <p>Does this look like enough to write a report?</p>
                <button onClick={() => handleResponse('yes')} className={styles.button}>Yes</button>
                <button onClick={() => handleResponse('no')} className={styles.button}>No</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
