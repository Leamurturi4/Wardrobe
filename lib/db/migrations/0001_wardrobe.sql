CREATE TABLE wardrobe_items (
  id text PRIMARY KEY, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data->>'category' IN ('Tops','Bottoms','Outerwear','Dresses','Shoes','Bags','Accessories','Jewelry')),
  CHECK (data->>'status' IN ('active','archived')), CHECK ((data->>'wearCount')::integer >= 0)
);
CREATE TABLE saved_outfits (
  id text PRIMARY KEY, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data->>'source' IN ('manual','ai-assisted','ai-generated'))
);
CREATE TABLE outfit_items (
  outfit_id text NOT NULL REFERENCES saved_outfits(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES wardrobe_items(id) ON DELETE RESTRICT,
  role text, position integer NOT NULL, PRIMARY KEY (outfit_id, item_id)
);
CREATE INDEX outfit_items_item_idx ON outfit_items(item_id);
CREATE INDEX wardrobe_items_data_idx ON wardrobe_items USING gin(data);
CREATE TABLE style_profiles (
  id text PRIMARY KEY, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
