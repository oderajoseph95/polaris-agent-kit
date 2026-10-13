// SYNTHETIC demo file: the same page after the kit's rules were followed. Not a real app.
type Item = { id: string; name: string; status: string };

export default function Items({ items, isSaving }: { items: Item[]; isSaving: boolean }) {
  return (
    <s-page heading="Items">
      <s-section heading="All items">
        <s-table>
          <s-table-header-row>
            <s-table-header listSlot="primary">Name</s-table-header>
            <s-table-header listSlot="secondary">Status</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {items.map((item) => (
              <s-table-row key={item.id}>
                <s-table-cell>{item.name}</s-table-cell>
                <s-table-cell>{item.status}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
        <s-switch label="Email me about changes" />
        <s-button variant="primary" loading={isSaving || undefined} disabled={isSaving || undefined}>Save</s-button>
      </s-section>
    </s-page>
  );
}
