import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminHeroImages } from '@/lib/content.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { addHeroImages, saveHeroImage, deleteHeroImage } from '@/app/actions/content.ts';
import { ActionForm, ConfirmSubmit, ImageField, Submit } from '../ui.tsx';

export const metadata = { title: 'Hero backgrounds' };

/**
 * The library of pictures behind the big green banner at the top of every public page. Each card
 * is edited where it stands — a name, an order and an on/off switch are all a picture has — and
 * the preview carries the same green shade the website lays over it, so what you see here is what
 * a visitor's headline will sit on.
 */
export default async function HeroImagesPage() {
  const user = await requirePage('HERO_IMAGES');
  const images = await adminHeroImages();
  const active = images.filter((image) => image.is_active).length;
  const mayCreate = canAction(user, 'HERO_IMAGES_CREATE');
  const mayEdit = canAction(user, 'HERO_IMAGES_UPDATE');
  const mayDelete = canAction(user, 'HERO_IMAGES_DELETE');

  return (
    <>
      <div className="panel">
        <header>
          <div>
            <h2>Hero backgrounds</h2>
            <p>
              {images.length} {images.length === 1 ? 'picture' : 'pictures'} · {active} switched on. Every page banner — the home
              page, Diaspora, Calculator, Insights and the rest — shows one of the switched-on pictures, chosen at random each
              time the page opens.
            </p>
          </div>
        </header>
      </div>

      {mayCreate ? (
        <ActionForm action={addHeroImages} success="Added to the library.">
          <div className="panel">
            <header>
              <div><h2>Add pictures</h2></div>
              <span style={{ flex: 1 }} />
              <Submit busy="Uploading…">Add to the library</Submit>
            </header>
            <div className="body">
              <ImageField
                name="photos"
                label="Pictures — choose one or several"
                multiple
                hint="Wide landscape photographs, at least 2000px across, up to 8 MB each. A green shade is laid over them on the website so the white headline stays readable."
              />
              <div className="field">
                <label htmlFor="new-label">What is in them (optional)</label>
                <input id="new-label" name="label" type="text" maxLength={120} placeholder="Kilimani apartments at dusk" />
              </div>
            </div>
          </div>
        </ActionForm>
      ) : null}

      {images.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <span className="big" aria-hidden="true">🖼</span>
            <h3>No pictures yet</h3>
            <p>Until there are, page banners show the plain green background — or the picture set under Company profile, if there is one.</p>
          </div>
        </div>
      ) : (
        <div className="hero-library">
          {images.map((image) => (
            <div key={image.id} className="hero-card">
              <ActionForm action={saveHeroImage} success="Saved.">
                <input type="hidden" name="id" value={image.id} />
                <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0 }}>
                  <div className="panel">
                    <div className="hero-thumb" data-off={!image.is_active}>
                      <img src={cdn(image.image_url, { width: 640, height: 300 })} alt={image.label ?? ''} loading="lazy" />
                      <span className="hero-thumb-line" aria-hidden="true">Where your dreams find funding.</span>
                      {image.is_active ? <span className="badge badge-ok">On</span> : <span className="badge badge-warn">Off</span>}
                    </div>
                    <div className="body">
                      <div className="field">
                        <label htmlFor={`label-${image.id}`}>What is in it</label>
                        <input id={`label-${image.id}`} name="label" type="text" maxLength={120} defaultValue={image.label ?? ''} placeholder="Kilimani apartments at dusk" />
                      </div>
                      <div className="hero-card-row">
                        <div className="field">
                          <label htmlFor={`sort-${image.id}`}>Order</label>
                          <input id={`sort-${image.id}`} name="sort" type="number" min={0} max={9999} defaultValue={image.sort} />
                        </div>
                        <div className="check-row">
                          <input id={`on-${image.id}`} name="is_active" type="checkbox" value="1" defaultChecked={image.is_active} />
                          <label htmlFor={`on-${image.id}`}>Show on the website</label>
                        </div>
                        {mayEdit ? <Submit className="btn btn-ghost btn-xs">Save</Submit> : null}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </ActionForm>
              {mayDelete ? (
                <ActionForm action={deleteHeroImage}>
                  <input type="hidden" name="id" value={image.id} />
                  <ConfirmSubmit message={`Remove ${image.label ? `“${image.label}”` : 'this picture'} from the library for good?`}>Remove from the library</ConfirmSubmit>
                </ActionForm>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
