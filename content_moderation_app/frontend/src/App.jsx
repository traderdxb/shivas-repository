import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [content, setContent] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('social_media');
  const [contentType, setContentType] = useState('text_post');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:8000/moderate', {
        content_item: {
          content,
          content_type: contentType,
          author_id: authorId,
          source_platform: sourcePlatform
        }
      });

      setResult(response.data);
    } catch (error) {
      console.error('Error moderating content:', error);
      alert('Error moderating content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Content Moderation Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Submit Content for Moderation</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="content">
                Content to Moderate
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="6"
                placeholder="Enter the content to be moderated..."
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="authorId">
                  Author ID
                </label>
                <input
                  type="text"
                  id="authorId"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter author ID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="sourcePlatform">
                  Source Platform
                </label>
                <select
                  id="sourcePlatform"
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="social_media">Social Media</option>
                  <option value="forum">Forum</option>
                  <option value="blog">Blog</option>
                  <option value="review_site">Review Site</option>
                  <option value="chat">Chat</option>
                </select>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="contentType">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text_post">Text Post</option>
                <option value="comment">Comment</option>
                <option value="forum_post">Forum Post</option>
                <option value="review">Review</option>
                <option value="message">Message</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {loading ? 'Moderating...' : 'Moderate Content'}
            </button>
          </form>
        </div>
        
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Moderation Result</h2>
            
            <div className={`p-4 rounded-md mb-4 ${
              result.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <p className="font-medium">
                Status: <span className="font-bold">{result.is_approved ? 'APPROVED' : 'NOT APPROVED'}</span>
              </p>
              <p>Action: {result.action}</p>
              <p>Confidence Score: {(result.confidence_score * 100).toFixed(2)}%</p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Violations Detected:</h3>
              <ul className="list-disc pl-5">
                {result.violations.length > 0 ? (
                  result.violations.map((violation, index) => (
                    <li key={index} className="text-red-600">{violation}</li>
                  ))
                ) : (
                  <li className="text-green-600">No violations detected</li>
                )}
              </ul>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Explanation:</h3>
              <p>{result.explanation}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Reviewed At:</h3>
              <p>{new Date(result.reviewed_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;