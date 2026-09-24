import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { saveProduct } from '@/app/actions/content.ts';
import { ActionFormRedirect, Submit } from '../../ui.tsx';
import { ProductFields } from '../product-fields.tsx';

export const metadata = { title: 'New loan product' };

export default async function NewProductPage() {
  const user = await requirePage('PRODUCTS');
  if (!canAction(user, 'PRODUCTS_CREATE')) {
    return <div className="note note-warn">Your Permission Set does not allow you to create loan products.</div>;
  }
  return (
    <>
      <div className="crumb"><Link href="/admin/products">Loan products</Link><span aria-hidden="true">›</span>New</div>
      <ActionFormRedirect action={saveProduct} to="/admin/products/:id">
        <div style={{ display: 'grid', gap: 20 }}>
          <ProductFields />
          <div><Submit>Create product</Submit></div>
        </div>
      </ActionFormRedirect>
    </>
  );
}
