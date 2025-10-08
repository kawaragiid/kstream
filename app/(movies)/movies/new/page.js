import SliderRow from '../../../../components/SliderRow';

let getNewReleases;

async function loadNew() {
  if (!getNewReleases) {
    try {
      ({ getNewReleases } = await import('../../../../lib/firestoreServer'));
    } catch (error) {
      console.warn('Firestore admin belum siap:', error.message);
      getNewReleases = async () => [];
    }
  }
  return getNewReleases(24).catch(() => []);
}

export const metadata = { title: 'Baru Rilis' };

export default async function NewMoviesPage() {
  const releases = await loadNew();

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Baru Rilis</h1>
        <p className="text-gray-600">Konten terbaru yang baru saja tayang.</p>
      </div>
      <SliderRow title="" items={releases} />
    </div>
  );
}

