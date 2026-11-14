#!/usr/bin/env bash

set -e

npm run verify
firebase deploy --only hosting
