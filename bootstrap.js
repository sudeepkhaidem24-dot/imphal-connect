// Imphal Connect V3 production bootstrap.
// The public shell is rendered by public/index.html itself.
// Do not rewrite HTML responses or inject competing client renderers.
// Public rendering must remain independent from Supabase/API availability.

const expressModule = await import('express');
const express = expressModule.default;

// Keep this hook intentionally side-effect free.
// Express static/sendFile responses are served exactly as committed.
// Any optional enhancement scripts must be explicitly referenced by a page.
