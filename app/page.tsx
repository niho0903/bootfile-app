import { redirect } from 'next/navigation';

// This isolated prototype branch opens the new experience, not the legacy marketing offer.
// Production master and existing /studio orders remain unchanged.
export default function HomePage() { redirect('/brand'); }
