#!/usr/bin/env bash

set -e

npm run build
firebase deploy --only hosting
