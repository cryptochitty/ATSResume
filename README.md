# ResumeAI - ATS-Optimized Resume Builder

ResumeAI is a production-ready resume builder that uses AI to help you create professional, ATS-optimized resumes in minutes.

## Features

- **ATS-Optimized Templates**: Clean, single-column layouts that pass through Applicant Tracking Systems easily.
- **AI Rewriting**: Uses the Google XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]") to quantify your impact.
- **AI Summary Generation**: Automatically generates a professional summary based on your experience and skills.
- **Live Preview**: Real-time preview of your resume as you type.
- **PDF Export**: Export your resume as a clean, selectable PDF.
- **Secure Auth**: Google Login powered by Firebase.
- **Premium Tier**: Stripe integration for subscription-based features.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend**: Node.js (Express), Gemini AI API.
- **Database/Auth**: Firebase Firestore & Firebase Auth.
- **Payments**: Stripe.

## Setup Instructions

1. **Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `STRIPE_SECRET_KEY`: Your Stripe secret key.
   - `VITE_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key.
   - `APP_URL`: The URL where the app is hosted.

2. **Firebase Setup**:
   - The app uses Firebase for Auth and Firestore.
   - Ensure `firebase-applet-config.json` is present with your project credentials.
   - Deploy the `firestore.rules` provided in the repository.

3. **Stripe Setup**:
   - Configure your Stripe dashboard with a product for "ResumeAI Premium".
   - Update the unit amount in `server.ts` if necessary.

## Deployment

The app is ready to be deployed to platforms like Vercel or Cloud Run.
- Build command: `npm run build`
- Start command: `npm start` (runs `node server.ts`)

## ATS Optimization Tips

- Use a single-column layout.
- Avoid tables, graphics, or complex formatting.
- Use standard section headings (Experience, Education, Skills).
- Use keywords relevant to the job description.
- Quantify your achievements using the Google XYZ formula.
