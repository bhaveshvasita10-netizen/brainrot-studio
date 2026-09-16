import { NextRequest, NextResponse } from 'next/server';

const animals = [
  'Tiger','Shark','Octopus','Dinosaur','Panda','Unicorn','Crocodile','Lion','Frog','Monkey',
  'Elephant','Penguin','Fox','Wolf','Gorilla','Zebra','Giraffe','Koala','Cheetah','Hippo',
  'Rhino','Turtle','Rabbit','Bear','Parrot','Owl','Falcon','Whale','Dolphin','Crab',
  'Lobster','Jellyfish','Axolotl','Gecko','Chameleon','Llama','Alpaca','Goat','Sheep','Pig'
];
const prefixes = [
  'Bana','Cappa','Turbo','Mega','Ninja','Wobble','Puffy','Cosmo','Robo','Flippy',
  'Zappy','Bongo','Mango','Glitch','Disco','Zoomy','Pico','Blinky','Chunky','Fuzzy'
];
const suffixes = [
  'nito','cini','tron','zilla','boo','pop','moto','zo','zilla','kins',
  'zap','bean','bop','doo','flip','woo','byte','roo','max','spark'
];

function buildLibrary(){
  const library = [] as {animal:string;prefix:string;suffix:string;name:string}[];
  for (let a=0;a<animals.length;a+=1) {
    for (let p=0;p<prefixes.length;p+=1) {
      for (let s=0;s<suffixes.length;s+=1) {
        const name = `${prefixes[p]}${suffixes[s]} ${animals[a]}`;
        library.push({animal:animals[a],prefix:prefixes[p],suffix:suffixes[s],name});
      }
    }
  }
  return library;
}

const library = buildLibrary();

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get('count') ?? 10);
  const count = Math.min(25, Math.max(1, Number.isFinite(requested) ? requested : 10));
  const picked = new Set<number>();
  const characters = [] as typeof library;
  while (characters.length < count) {
    const index = Math.floor(Math.random() * library.length);
    if (picked.has(index)) continue;
    picked.add(index);
    characters.push(library[index]);
  }
  return NextResponse.json({characters,totalAvailable:library.length},{headers:{'Cache-Control':'no-store'}});
}
