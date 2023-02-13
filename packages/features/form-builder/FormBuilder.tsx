import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import {
  Label,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  Form,
  BooleanToggleGroupField,
  SelectField,
  InputField,
  Input,
} from "@calcom/ui";
import { Switch } from "@calcom/ui";
import { FiArrowDown, FiArrowUp, FiX, FiPlus, FiTrash2, FiInfo } from "@calcom/ui/components/icon";

import { Components } from "./Components";
import { fieldsSchema } from "./FormBuilderFieldsSchema";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];

/**
 * It works with a react-hook-form only.
 * `formProp` specifies the name of the property in the react-hook-form that has the fields. This is where fields would be updated.
 */
export const FormBuilder = function FormBuilder({
  title,
  description,
  addFieldLabel,
  formProp,
}: {
  formProp: string;
  title: string;
  description: string;
  addFieldLabel: string;
}) {
  const FieldTypes: {
    value: RhfForm["fields"][number]["type"];
    label: string;
    needsOptions?: boolean;
    systemOnly?: boolean;
    isTextType?: boolean;
  }[] = [
    {
      label: "Name",
      value: "name",
      isTextType: true,
    },
    {
      label: "Email",
      value: "email",
      isTextType: true,
    },
    {
      label: "Phone",
      value: "phone",
      isTextType: true,
    },
    {
      label: "Short Text",
      value: "text",
      isTextType: true,
    },
    {
      label: "Number",
      value: "number",
      isTextType: true,
    },
    {
      label: "Long Text",
      value: "textarea",
      isTextType: true,
    },
    {
      label: "Select",
      value: "select",
      needsOptions: true,
      isTextType: true,
    },
    {
      label: "MultiSelect",
      value: "multiselect",
      needsOptions: true,
      isTextType: false,
    },
    {
      label: "Multiple Emails",
      value: "multiemail",
      isTextType: true,
    },
    {
      label: "Radio Input",
      value: "radioInput",
      isTextType: false,
      systemOnly: true,
    },
    {
      label: "Checkbox Group",
      value: "checkbox",
      needsOptions: true,
      isTextType: false,
    },
    {
      label: "Radio Group",
      value: "radio",
      needsOptions: true,
      isTextType: false,
    },
    {
      label: "Checkbox",
      value: "boolean",
      isTextType: false,
    },
  ];
  // I would have like to give Form Builder it's own Form but nested Forms aren't something that browsers support.
  // So, this would reuse the same Form as the parent form.
  const fieldsForm = useFormContext<RhfForm>();
  const rhfFormPropName = formProp as unknown as "fields";
  const { t } = useLocale();
  const fieldForm = useForm<RhfFormField>();
  const { fields, swap, remove, update, append } = useFieldArray({
    control: fieldsForm.control,
    // TODO: Not sure how to make it configurable and keep TS happy
    name: rhfFormPropName,
  });

  function OptionsField({
    label = "Options",
    value,
    onChange,
    className = "",
    readOnly = false,
  }: {
    label?: string;
    value: { label: string; value: string }[];
    onChange: (value: { label: string; value: string }[]) => void;
    className?: string;
    readOnly?: boolean;
  }) {
    const [animationRef] = useAutoAnimate<HTMLUListElement>();
    value = value || [
      {
        label: "Option 1",
        value: "1",
      },
      {
        label: "Option 2",
        value: "2",
      },
    ];
    return (
      <div className={className}>
        <Label>{label}</Label>
        <div className="rounded-md bg-gray-50 p-4">
          <ul ref={animationRef}>
            {value?.map((option, index) => (
              <li key={index}>
                <div className="flex items-center">
                  <Input
                    required
                    value={option.label}
                    onChange={(e) => {
                      // Right now we use label of the option as the value of the option. It allows us to not separately lookup the optionId to know the optionValue
                      // It has the same drawback that if the label is changed, the value of the option will change. It is not a big deal for now.
                      value.splice(index, 1, {
                        label: e.target.value,
                        value: e.target.value.toLowerCase().trim(),
                      });
                      onChange(value);
                    }}
                    readOnly={readOnly}
                    placeholder={`Enter Option ${index + 1}`}
                  />
                  {value.length > 2 && !readOnly && (
                    <Button
                      type="button"
                      className="mb-2 -ml-8 hover:!bg-transparent focus:!bg-transparent focus:!outline-none focus:!ring-0"
                      size="sm"
                      color="minimal"
                      StartIcon={FiX}
                      onClick={() => {
                        if (!value) {
                          return;
                        }
                        const newOptions = [...value];
                        newOptions.splice(index, 1);
                        onChange(newOptions);
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <Button
              color="minimal"
              onClick={() => {
                value.push({ label: "", value: "" });
                onChange(value);
              }}
              StartIcon={FiPlus}>
              Add an Option
            </Button>
          )}
        </div>
      </div>
    );
  }
  const [fieldDialog, setFieldDialog] = useState({
    isOpen: false,
    fieldIndex: -1,
  });

  const addField = () => {
    fieldForm.reset({});
    setFieldDialog({
      isOpen: true,
      fieldIndex: -1,
    });
  };

  const editField = (index: number, data: RhfFormField) => {
    fieldForm.reset(data);
    setFieldDialog({
      isOpen: true,
      fieldIndex: index,
    });
  };

  const removeField = (index: number) => {
    remove(index);
  };

  const fieldType = FieldTypes.find((f) => f.value === fieldForm.watch("type"));
  const isFieldEditMode = fieldDialog.fieldIndex !== -1;
  return (
    <div>
      <div>
        <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">{title}</div>
        <p className=" max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
          {description}
        </p>
        <ul className="mt-2 rounded-md border">
          {fields.map((field, index) => {
            const fieldType = FieldTypes.find((f) => f.value === field.type);

            // Hidden fields can't be required
            const isRequired = field.required && !field.hidden;

            if (!fieldType) {
              throw new Error(`Invalid field type - ${field.type}`);
            }
            return (
              <li key={index} className="group relative flex justify-between border-b p-4 last:border-b-0">
                <button
                  type="button"
                  className="invisible absolute -left-[12px] ml-0 flex  h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index - 1)}>
                  <FiArrowUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="invisible absolute -left-[12px] mt-8 ml-0 flex  h-6 w-6 scale-0  items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index + 1)}>
                  <FiArrowDown className="h-5 w-5" />
                </button>
                <div className="flex">
                  <div>
                    <div className="flex items-center">
                      <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">
                        {field.label || t(field.defaultLabel || "")}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="gray">{isRequired ? "Required" : "Optional"}</Badge>
                        {field.hidden ? <Badge variant="gray">Hidden</Badge> : null}
                        {field.sources?.map(
                          (s, key) =>
                            s.type !== "user" && (
                              <Badge key={key} variant="blue">
                                {s.label}
                              </Badge>
                            )
                        )}
                      </div>
                    </div>
                    <p className="max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
                      {fieldType.label}
                    </p>
                  </div>
                </div>
                {field.editable !== "user-readonly" && (
                  <div className="flex items-center space-x-2">
                    {field.editable !== "system" && (
                      <Switch
                        checked={!field.hidden}
                        onCheckedChange={(checked) => {
                          update(index, { ...field, hidden: !checked });
                        }}
                      />
                    )}
                    <Button
                      color="secondary"
                      onClick={() => {
                        editField(index, field);
                      }}>
                      Edit
                    </Button>
                    {field.editable !== "system" && field.editable !== "system-but-optional" && (
                      <Button
                        className="!p-0"
                        color="minimal"
                        onClick={() => {
                          removeField(index);
                        }}
                        StartIcon={FiTrash2}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button color="minimal" onClick={addField} className="mt-4" StartIcon={FiPlus}>
          {addFieldLabel}
        </Button>
      </div>
      <Dialog
        open={fieldDialog.isOpen}
        onOpenChange={(isOpen) =>
          setFieldDialog({
            isOpen,
            fieldIndex: -1,
          })
        }>
        <DialogContent>
          <DialogHeader title="Add a question" subtitle="Customize the questions asked on the booking page" />
          <div>
            <Form
              form={fieldForm}
              handleSubmit={(data) => {
                if (fieldDialog.fieldIndex !== -1) {
                  update(fieldDialog.fieldIndex, data);
                } else {
                  const field: RhfFormField = {
                    ...data,
                    sources: [
                      {
                        label: "User",
                        type: "user",
                        id: "user",
                        fieldRequired: data.required,
                      },
                    ],
                  };
                  field.editable = field.editable || "user";
                  append(field);
                }
                setFieldDialog({
                  isOpen: false,
                  fieldIndex: -1,
                });
              }}>
              <SelectField
                required
                isDisabled={
                  fieldForm.getValues("editable") === "system" ||
                  fieldForm.getValues("editable") === "system-but-optional"
                }
                onChange={(e) => {
                  const value = e?.value;
                  if (!value) {
                    return;
                  }
                  fieldForm.setValue("type", value);
                }}
                value={FieldTypes.find((fieldType) => fieldType.value === fieldForm.getValues("type"))}
                options={FieldTypes.filter((f) => !f.systemOnly)}
                label="Input Type"
              />
              <InputField
                required
                {...fieldForm.register("name")}
                containerClassName="mt-6"
                disabled={
                  fieldForm.getValues("editable") === "system" ||
                  fieldForm.getValues("editable") === "system-but-optional"
                }
                label="Name"
              />
              <InputField
                {...fieldForm.register("label")}
                required
                placeholder={t(fieldForm.getValues("defaultLabel") || "")}
                containerClassName="mt-6"
                label="Label"
              />
              {fieldType?.isTextType ? (
                <InputField
                  {...fieldForm.register("placeholder")}
                  containerClassName="mt-6"
                  label="Placeholder"
                  placeholder={t(fieldForm.getValues("defaultPlaceholder") || "")}
                />
              ) : null}

              {fieldType?.needsOptions ? (
                <Controller
                  name="options"
                  render={({ field: { value, onChange } }) => {
                    return <OptionsField onChange={onChange} value={value} className="mt-6" />;
                  }}
                />
              ) : null}
              <Controller
                name="required"
                control={fieldForm.control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <BooleanToggleGroupField
                      disabled={fieldForm.getValues("editable") === "system"}
                      value={value}
                      onValueChange={(val) => {
                        onChange(val);
                      }}
                      label="Required"
                    />
                  );
                }}
              />
              <DialogFooter>
                <DialogClose color="secondary">Cancel</DialogClose>
                {/* TODO: i18n missing */}
                <Button type="submit">{isFieldEditMode ? t("save") : t("add")}</Button>
              </DialogFooter>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// TODO: Add consistent label support to all the components and then remove this
const WithLabel = ({
  field,
  children,
  readOnly,
}: {
  field: Partial<RhfFormField>;
  readOnly: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div>
      {/* multiemail doesnt show label initially. It is shown on clicking CTA */}
      {/* boolean type doesn't have a label overall, the radio has it's own label */}
      {field.type !== "boolean" && field.type !== "multiemail" && field.label && (
        <div className="mb-2 flex items-center">
          <Label className="!mb-0 flex items-center">{field.label}</Label>
          <span className="ml-1 -mb-1 text-sm font-medium leading-none">
            {!readOnly && field.required ? "*" : ""}
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

type ValueProps =
  | {
      value: string[];
      setValue: (value: string[]) => void;
    }
  | {
      value: string;
      setValue: (value: string) => void;
    }
  | {
      value: {
        value: string;
        optionValue: string;
      };
      setValue: (value: { value: string; optionValue: string }) => void;
    }
  | {
      value: boolean;
      setValue: (value: boolean) => void;
    };

export const ComponentForField = ({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: Omit<RhfFormField, "editable" | "label"> & {
    // Label is optional because radioInput doesn't have a label
    label?: string;
  };
  readOnly: boolean;
} & ValueProps) => {
  const fieldType = field.type;
  const componentConfig = Components[fieldType];

  const isValueOfPropsType = (val: unknown, propsType: typeof componentConfig.propsType) => {
    if (propsType === "text") {
      return typeof val === "string";
    }
    if (propsType === "boolean") {
      return typeof val === "boolean";
    }
    if (propsType === "textList") {
      return val instanceof Array && val.every((v) => typeof v === "string");
    }
    if (propsType === "select") {
      return typeof val === "string";
    }
    if (propsType === "multiselect") {
      return val instanceof Array && val.every((v) => typeof v === "string");
    }
    if (propsType === "objectiveWithInput") {
      return typeof value === "object" && value !== null ? "value" in value : false;
    }
    throw new Error(`Unknown propsType ${propsType}`);
  };

  // If possible would have wanted `isValueOfPropsType` to narrow the type of `value` and `setValue` accordingly, but can't seem to do it.
  // So, code following this uses type assertion to tell TypeScript that everything has been validated
  if (value !== undefined && !isValueOfPropsType(value, componentConfig.propsType)) {
    throw new Error(
      `Value ${value} is not valid for type ${componentConfig.propsType} for field ${field.name}`
    );
  }

  if (componentConfig.propsType === "text") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          label={field.label}
          readOnly={readOnly}
          name={field.name}
          value={value as string}
          setValue={setValue as (arg: typeof value) => void}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "boolean") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          label={field.label}
          readOnly={readOnly}
          value={value as boolean}
          setValue={setValue as (arg: typeof value) => void}
          placeholder={field.placeholder}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "textList") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          label={field.label}
          readOnly={readOnly}
          value={value as string[]}
          // TypeScript: Why you no work ??
          setValue={setValue as (arg: typeof value) => void}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "select") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }

    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          readOnly={readOnly}
          value={value as string}
          placeholder={field.placeholder}
          setValue={setValue as (arg: typeof value) => void}
          options={field.options.map((o) => ({ ...o, title: o.label }))}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "multiselect") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          readOnly={readOnly}
          value={value as string[]}
          setValue={setValue as (arg: typeof value) => void}
          options={field.options.map((o) => ({ ...o, title: o.label }))}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "objectiveWithInput") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    if (!field.optionsInputs) {
      throw new Error("Field optionsInputs is not defined");
    }
    return field.options.length ? (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          readOnly={readOnly}
          name={field.name}
          value={value as { value: string; optionValue: string }}
          setValue={setValue as (arg: typeof value) => void}
          optionsInputs={field.optionsInputs}
          options={field.options}
        />
      </WithLabel>
    ) : null;
  }

  throw new Error(`Field ${field.name} does not have a valid propsType`);
};

export const FormBuilderField = ({
  field,
  readOnly,
  className,
}: {
  field: RhfFormFields[number];
  readOnly: boolean;
  className: string;
}) => {
  const { t } = useLocale();
  const { control, formState } = useFormContext();
  return (
    <div
      data-form-builder-field-name={field.name}
      className={classNames(className, field.hidden ? "hidden" : "")}>
      <Controller
        control={control}
        // Make it a variable
        name={`responses.${field.name}`}
        render={({ field: { value, onChange } }) => {
          return (
            <div>
              <ComponentForField
                field={field}
                value={value}
                // Choose b/w disabled and readOnly
                readOnly={readOnly}
                setValue={(val: unknown) => {
                  onChange(val);
                }}
              />
              <ErrorMessage
                name="responses"
                errors={formState.errors}
                render={({ message }) => {
                  const name = message?.replace(/\{([^}]+)\}.*/, "$1");
                  // Use the message targeted for it.
                  if (name !== field.name) {
                    return null;
                  }

                  message = message.replace(/\{[^}]+\}(.*)/, "$1");
                  if (field.hidden) {
                    console.error(`Error message for hidden field:${field.name} => ${message}`);
                  }
                  return (
                    <div
                      data-field-name={field.name}
                      className="mt-2 flex items-center text-sm text-red-700 ">
                      <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                      <p>{t(message)}</p>
                    </div>
                  );
                }}
              />
            </div>
          );
        }}
      />
    </div>
  );
};
