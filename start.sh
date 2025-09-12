#!/bin/bash

# Execute the backend start script
cd "$(dirname "$0")/backend" && exec bash start.sh
