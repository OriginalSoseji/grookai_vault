update public.card_prints
set image_url = case
  when image_url like 'https://assets.tcgdex.net/%' and
       image_url not like '%.png' and image_url not like '%.jpg' and image_url not like '%.jpeg' and image_url not like '%.webp'
  then
    case when right(image_url, 1) = '/' then image_url || 'high.png'
         when image_url ~ '/[0-9]+$' then image_url || '/high.png'
         else image_url || '.png'
    end
  else image_url
end
where image_url is not null
  and image_url like 'https://assets.tcgdex.net/%'
  and (image_url not like '%.png' and image_url not like '%.jpg' and image_url not like '%.jpeg' and image_url not like '%.webp');
