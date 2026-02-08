#!/bin/bash
echo "Testing health endpoint on port 3459..."
curl -v http://localhost:3459/api/health 2>&1 | head -30
