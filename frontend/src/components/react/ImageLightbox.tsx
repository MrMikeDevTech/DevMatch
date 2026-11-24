export default function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={onClose}
            role="presentation"
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar preview"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-white hover:bg-surface"
            >
                ×
            </button>
            <img
                src={src}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-lg object-contain"
            />
        </div>
    );
}
