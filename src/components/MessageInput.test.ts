import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MessageInput from "./MessageInput.vue";

describe("MessageInput", () => {
  it("emits submit with the text and clears the field", async () => {
    const wrapper = mount(MessageInput, { props: { streaming: false } });

    await wrapper.find("input").setValue("hello");
    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.emitted("submit")?.[0]).toEqual(["hello"]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
  });

  it("does not emit on empty input", async () => {
    const wrapper = mount(MessageInput, { props: { streaming: false } });

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("shows a Stop button while streaming that emits cancel", async () => {
    const wrapper = mount(MessageInput, { props: { streaming: true } });
    expect(wrapper.text()).toContain("Stop");

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("keeps typed text when Enter is pressed while streaming", async () => {
    const wrapper = mount(MessageInput, { props: { streaming: true } });

    await wrapper.find("input").setValue("next question");
    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("next question");
  });
});
