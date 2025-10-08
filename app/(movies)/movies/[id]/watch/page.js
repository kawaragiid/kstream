
import { notFound, redirect } from "next/navigation";

let getVideoById;

async function ensureFirestore() {
  if (!getVideoById) {
    try {
      ({ getVideoById } = await import("@/lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
    }
  }
}

export default async function MovieWatchRedirect(props) {
  const params = await props.params;
  await ensureFirestore();
  const video = await getVideoById(params.id);

  if (!video) {
    notFound();
  }

  const slugOrId = video.slug || video.id;
  const type = video.type === "series" ? "series" : "movie";
  const searchParams = new URLSearchParams({ id: slugOrId, type });

  redirect(`/player?${searchParams.toString()}`);
}
