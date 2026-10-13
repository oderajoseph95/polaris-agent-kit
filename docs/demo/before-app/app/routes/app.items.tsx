// SYNTHETIC demo file: written the way an unassisted coding agent often writes it. Not a real app.
import { Page, Card } from "@shopify/polaris";

type Item = { id: string; gid: string; name: string; status: string };

export default function Items({ items, isSaving }: { items: Item[]; isSaving: boolean }) {
  return (
    <s-page heading="Items">
      <s-section heading="All items">
        <s-table>
          <s-table-header-row>
            <s-table-header list-slot="primary">Name</s-table-header>
            <s-table-header list-slot="secondary">Status</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {items.map((item) => (
              <s-table-row key={item.id}>
                <s-table-cell>{item.name}</s-table-cell>
                <s-table-cell>{item.gid}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
        <s-switch label="Email me about changes" checked="false" />
        <s-button variant="primary" loading={isSaving} disabled={isSaving}>Save</s-button>
      </s-section>
    </s-page>
  );
}
