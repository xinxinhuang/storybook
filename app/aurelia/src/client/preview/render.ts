import { document } from 'global';
import { DebugConfiguration } from '@aurelia/debug';
import { BasicConfiguration } from '@aurelia/jit-html-browser';
import { Aurelia, INode, CustomElement } from '@aurelia/runtime';
import { Registration } from '@aurelia/kernel';
import { RenderMainArgs } from './types';
import { Component } from './decorators';

const host = document.getElementById('root'); // the root iframe provided by storybook
let previousAurelia: Aurelia<INode>;
export default async function render({
  storyFn,
  selectedKind,
  selectedStory,
  showMain,
  showError,
}: RenderMainArgs) {
  const element = storyFn();

  if (!element) {
    showError({
      title: `Expecting an Aurelia component from the story: "${selectedStory}" of "${selectedKind}".`,
      description: `
        Did you forget to return the Aurelia component from the story?
        Use "() => ({ template: '<custom-component></custom-component>' })" when defining the story.
      `,
    });
  }
  showMain();

  if (previousAurelia) {
    await previousAurelia.stop().wait();
  }

  previousAurelia = new Aurelia(element.container);
  if (element.items && element.items.length > 0) {
    previousAurelia.register(...element.items);
  } else {
    previousAurelia.register(BasicConfiguration, DebugConfiguration);
  }

  if (element.components && element.components.length > 0) {
    previousAurelia.container.register(...element.components);
    element.components
      .filter(y => y.aliases && y.aliases.length > 0)
      .forEach(y =>
        (y as Component).aliases.forEach(alias => Registration.alias((y as Component).item, alias))
      );
  }

  const isConstructable = element.state && element.state.prototype;
  let App = CustomElement.define(
    { name: 'app', template: element.template },
    isConstructable ? element.state : class {}
  );

  if (!isConstructable) {
    App = new App();
    Object.keys(element.state).forEach(prop => {
      App[prop] = element.state[prop];
    });
  }

  await previousAurelia
    .app({
      host,
      component: App,
    })
    .start()
    .wait();
}