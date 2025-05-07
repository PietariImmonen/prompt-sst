import * as React from "react";

import dayjs, { ConfigType } from "@sst-replicache-template/core/lib/dayjs";

export type Option = {
  label: string;
  value: number;
};

/**
 * creates an array of times on a 15 minute interval from
 * 00:00:00 (start of day) to
 * 23:59:00 (end of day)
 */

const INCREMENT = 15;

export const useTimeOptions = () => {
  const [filteredOptions, setFilteredOptions] = React.useState<Option[]>([]);

  const options = React.useMemo(() => {
    const end = dayjs()
      .utc()
      .endOf("day")
      .set("seconds", 0)
      .set("milliseconds", 0);
    const options: Option[] = [];
    for (
      let t = dayjs().utc().startOf("day");
      t.isBefore(end);
      t = t.add(
        INCREMENT + (!t.add(INCREMENT).isSame(t, "day") ? -1 : 0),
        "minutes",
      )
    ) {
      options.push({
        value: t.toDate().valueOf(),
        label: dayjs(t).utc().format("HH:mm"),
      });
    }
    // allow 23:59
    options.push({
      value: end.toDate().valueOf(),
      label: dayjs(end).utc().format("HH:mm"),
    });
    return options;
  }, []);

  const filter = React.useCallback(
    ({
      offset,
      limit,
      current,
    }: {
      offset?: ConfigType;
      limit?: ConfigType;
      current?: ConfigType;
    }) => {
      if (current) {
        const currentOption = options.find(
          (option) => option.value === dayjs(current).toDate().valueOf(),
        );
        if (currentOption) setFilteredOptions([currentOption]);
      } else
        setFilteredOptions(
          options.filter((option) => {
            const time = dayjs(option.value);
            return (
              (!limit || time.isBefore(limit)) &&
              (!offset || time.isAfter(offset))
            );
          }),
        );
    },
    [options],
  );

  return { options: filteredOptions, filter, defaultOptions: options };
};
