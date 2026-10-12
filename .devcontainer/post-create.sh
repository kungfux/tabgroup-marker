#!/bin/bash

# Install Node.js packages
if [ -f package-lock.json ]; then
	npm ci
else
	npm install
fi
