import mitt from "mitt";

type Events = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  poke: {};
};

export const bus = mitt<Events>();
