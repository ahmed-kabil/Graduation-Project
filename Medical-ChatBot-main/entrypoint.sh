#!/bin/bash

echo "=========================================="
echo "Medical ChatBot Container Starting..."
echo "=========================================="

# Check if API keys are configured
if [[ -z "$PINECONE_API_KEY" || "$PINECONE_API_KEY" == "your_pinecone_api_key_here" ]]; then
    echo "⚠️  PINECONE_API_KEY not configured - skipping indexing"
    echo "   Set real API keys in .env to enable the medical chatbot"
    SKIP_INDEXING=true
elif [[ -z "$GROQ_API_KEY" || "$GROQ_API_KEY" == "your_groq_api_key_here" ]]; then
    echo "⚠️  GROQ_API_KEY not configured - skipping indexing"
    echo "   Set real API keys in .env to enable the medical chatbot"
    SKIP_INDEXING=true
else
    SKIP_INDEXING=false
fi

# Check if data directory has PDF files and run indexing
if [[ "$SKIP_INDEXING" == "false" ]] && ls /app/data/*.pdf 1> /dev/null 2>&1; then
    echo "📄 Found PDF files in /app/data/"
    if [[ "${FORCE_REINDEX:-false}" == "true" ]]; then
        echo "🔁 FORCE_REINDEX=true — will delete and recreate index with updated chunking"
    fi
    echo "🔄 Running document indexing to Pinecone..."
    if python store_index.py; then
        echo "✅ Indexing complete!"
    else
        echo "⚠️  Indexing failed, but continuing to start server..."
    fi
elif [[ "$SKIP_INDEXING" == "false" ]]; then
    echo "⚠️  No PDF files found in /app/data/ - skipping indexing"
fi

echo ""
echo "🚀 Starting Flask application on port 9090..."
echo "=========================================="

# Start the Flask application
exec python app.py
