-- Update existing purchases with sequential IDs
DO $$
DECLARE
    r RECORD;
    counter INT := 1;
BEGIN
    FOR r IN SELECT id FROM purchases ORDER BY created_at
    LOOP
        UPDATE purchases 
        SET purchase_id = 'PUR-' || LPAD(counter::TEXT, 3, '0')
        WHERE id = r.id;
        counter := counter + 1;
    END LOOP;
END $$;
