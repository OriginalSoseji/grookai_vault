import Link from "next/link";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";

type FeaturedCardTileProps = {
  gv_id: string;
  name: string;
  image_url: string;
};

export default function FeaturedCardTile({ gv_id, name, image_url }: FeaturedCardTileProps) {
  return (
    <PokemonCardGridTile
      imageSrc={image_url}
      imageAlt={name}
      imageHref={`/card/${gv_id}`}
      title={
        <Link href={`/card/${gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
          {name}
        </Link>
      }
      footer={<span>{gv_id}</span>}
    />
  );
}
