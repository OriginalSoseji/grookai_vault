import {expect,test} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/binders/card-options**',route=>route.fulfill({json:{items:[]}}));
});

test('density is remembered, numbered moves are explicit and image export is a PNG',async({page})=>{
  await page.goto('/visual-fixtures/collector-refinement?view=binder');
  await page.getByLabel('Binder grid size').selectOption('0');
  await expect(page.getByLabel('Choose Binder page')).toContainText('Page 1 / 3');
  await page.reload();
  await expect(page.getByLabel('Binder grid size')).toHaveValue('0');
  await page.getByRole('button',{name:'Pocket 1: Eevee',exact:true}).click();
  await page.getByRole('button',{name:'Move to pocket',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Move to pocket',exact:true});
  await dialog.getByLabel('Destination pocket').fill('11');
  await expect(dialog).toContainText('Page 3, row 2, column 1');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pocket 1: Eevee, move selected card here',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Move to pocket',exact:true}).click();
  await dialog.getByLabel('Destination pocket').fill('11');
  await dialog.getByRole('button',{name:'Move card',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pocket 11: Eevee',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Share page image'}).click();
  const preview=page.getByRole('dialog',{name:'Binder page image',exact:true});
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Ownership not shown');
  const png=await preview.locator('img').evaluate(async(img:HTMLImageElement)=>{const blob=await(await fetch(img.src)).blob();const bitmap=await createImageBitmap(blob);return {type:blob.type,width:bitmap.width,height:bitmap.height};});
  expect(png.type).toBe('image/png');expect(png.width).toBe(1080);expect(png.height).toBeGreaterThan(1000);
});

test('touch hold moves across page edges without accidental click',async({page})=>{
  await page.goto('/visual-fixtures/collector-refinement?view=binder');
  const source=page.locator('[data-binder-pocket="0"]');
  await source.dispatchEvent('pointerdown',{pointerType:'touch',clientX:100,clientY:200,pointerId:1});
  await expect(source).toHaveAttribute('data-held','true');
  const edge=page.getByRole('button',{name:'Next binder page'});await edge.scrollIntoViewIfNeeded();
  const box=(await edge.boundingBox())!;
  await page.evaluate(({x,y})=>document.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:x,clientY:y})),{x:box.x+box.width/2,y:box.y+box.height/2});
  await expect(page.getByLabel('Choose Binder page')).toHaveValue('1');
  const target=page.locator('[data-binder-pocket="10"]');await target.scrollIntoViewIfNeeded();const drop=(await target.boundingBox())!;
  await page.evaluate(({x,y})=>document.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',clientX:x,clientY:y})),{x:drop.x+drop.width/2,y:drop.y+drop.height/2});
  await expect(page.getByRole('button',{name:'Pocket 11: Eevee',exact:true})).toBeVisible();
});

test('real custom editor finds a slot, undoes and redoes order, inspection preserves wire identity',async({page})=>{
  await page.goto('/visual-fixtures/collector-refinement?view=editor');
  const wire=page.locator('input[name="slotsJson"]');const baseline=await wire.inputValue();
  await page.getByRole('button',{name:'Checklist',exact:true}).click();
  await page.getByLabel('Find in checklist').fill('Pikachu');
  await page.getByRole('button',{name:'Show in Arrange'}).first().click();
  await expect(page.getByRole('button',{name:'Pocket 2: Pikachu',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pocket 2: Pikachu',exact:true}).click();
  await page.getByRole('button',{name:'Pocket 1: Eevee, move selected card here',exact:true}).click();
  const changed=await wire.inputValue();expect(changed).not.toBe(baseline);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(wire).toHaveValue(baseline);
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(wire).toHaveValue(changed);
  await page.getByRole('button',{name:'Pocket 1: Pikachu',exact:true}).click();
  await page.getByRole('button',{name:'Inspect card',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Inspect Binder card'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(wire).toHaveValue(changed);
  let prompt='';page.once('dialog',async dialog=>{prompt=dialog.message();await dialog.dismiss();});
  await page.getByRole('link',{name:'Card preview',exact:true}).click();
  expect(prompt).toContain('without saving');expect(page.url()).toContain('view=editor');
});

for(const width of [320,1280])for(const dark of [false,true])test(`cover artwork gallery ${width} ${dark?'dark':'light'}`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/visual-fixtures/collector-refinement?view=cover');
  await page.evaluate(d=>document.documentElement.classList.toggle('gv-dark',d),dark);
  await page.getByRole('button',{name:'Choose Binder cover artwork'}).click();
  const dialog=page.getByRole('dialog',{name:'Choose Binder cover',exact:true});
  await dialog.getByLabel('Search checklist artwork').fill('Pikachu');
  await expect(dialog.getByRole('button',{name:/Pikachu Base Set/})).toBeVisible();
  await expect.poll(()=>dialog.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path:`test-results/binder-cover-${width}-${dark?'dark':'light'}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await dialog.getByRole('button',{name:/Pikachu Base Set/}).click();
  await expect(page.locator('input[name="coverCardPrintId"]')).toHaveValue('pikachu');
  await page.getByRole('button',{name:'Choose Binder cover artwork'}).click();await dialog.getByRole('button',{name:'No cover',exact:true}).click();
  await expect(page.locator('input[name="coverCardPrintId"]')).toHaveValue('');
});
