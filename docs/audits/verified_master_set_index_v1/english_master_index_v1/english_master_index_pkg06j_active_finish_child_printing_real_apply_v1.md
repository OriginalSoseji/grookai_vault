# PKG-06J Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06J active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06j_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `5bae5af1da3258540c9d010c88023fa4ea668bacde0db12bc454e0a4ec6f2879` |
| inserted_rows | 68 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"bw7":7,"dp1":7,"hgss1":7,"mcd17":6,"mcd22":6,"pop5":7,"swsh3":7,"swsh5":7,"swsh9":7,"xy4":7}
- by_finish: {"cosmos":30,"holo":17,"normal":18,"reverse":3}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = '4bcc20dd-43d3-4466-addb-5a7b02742915'::uuid and card_print_id = '2c5d16d6-8cdc-4035-a390-5098ca9c6194'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '414df941-ae62-434d-b375-4c247e8c354a'::uuid and card_print_id = 'ddd31e27-9b06-48b1-8147-270a9690ef66'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '7424a98a-6db6-4b03-a389-8b5bb11acc99'::uuid and card_print_id = 'd9dae53e-9683-4c01-b587-10590e0d121d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '47fc46cf-2e1d-49d3-ab75-0ba20f3e16fe'::uuid and card_print_id = '40b70c25-20b6-4888-8cf0-88bc6da7cfce'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'bdbde8d1-90c8-4d57-89b6-163dae2686b8'::uuid and card_print_id = '5b720829-30a0-42cf-9203-6e01fa50fff7'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'a7e6c358-8347-40c7-b7a3-1b06e6f3e3c0'::uuid and card_print_id = 'abc1a7d0-5bc6-46f9-a2ef-76d156c9c719'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'edddd688-e64b-40eb-9e1c-04a933663c6e'::uuid and card_print_id = 'd09c0912-9a8d-45dd-a276-09da28bab494'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '2d97e430-2a72-4ee6-97a1-6af98218146d'::uuid and card_print_id = '1c4759db-9b50-45d0-9c0b-655977006168'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '337bbe0a-6d13-44e4-9237-e0d6765fec6c'::uuid and card_print_id = '98b5e8e1-99c6-4c6e-9d89-ed1accb2dfb6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '648cf97f-8254-4206-9644-4a92d35218cd'::uuid and card_print_id = '60efdde4-8b1e-4d21-b2d5-c8163d93691d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '29c5c104-57ad-41ff-b342-bc7cbcfe07bf'::uuid and card_print_id = 'f16bd0f6-341f-4085-8047-8c84238bf8e4'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '0dadc64e-7400-4c2d-81b1-b1848eab8480'::uuid and card_print_id = 'fd2f7b7c-1dcc-47b8-9fe3-df9deccba773'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'ce27edb5-5496-4ad4-abb4-a98ae5f6f1e4'::uuid and card_print_id = '85c15e81-c19e-4904-a923-0a1782e901d9'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'b0f5bf1a-8ab8-4249-a70c-2e01a6a39d2f'::uuid and card_print_id = 'bc9dfb62-bf0b-460c-9d25-3e3a80ad3964'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4a4a512f-ee1b-47eb-9ea0-6a0d446d6f5a'::uuid and card_print_id = '52b4fc4f-d6da-43f0-a13b-71b52445adbb'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0d271504-9c4c-438d-9936-0e2f55f2ebc0'::uuid and card_print_id = '2ed1ec29-d8bb-4933-bec2-ee9a48de871b'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0a9a812b-50a3-4933-a8bd-075f78503b7c'::uuid and card_print_id = '61800823-eef1-4db4-a539-c4f508734134'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '5a70fc03-7661-4767-afca-8d50d8cb44b2'::uuid and card_print_id = '9b2cedd8-24bd-424d-af71-e138f75dbd3b'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7bd823dc-93be-47b6-9334-bdb3ff4eb038'::uuid and card_print_id = '077bea43-80cb-414b-b58d-5bb533a7d73d'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '11c7edcd-5ab0-451d-8389-1c5a11e785fe'::uuid and card_print_id = 'c9c6edad-1ca7-4a9f-b45c-b88a83a17988'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2f98bd69-b221-44a6-b766-d8eb3ebd7036'::uuid and card_print_id = '2d26dcd1-d42b-4e77-9654-7f9b4297b916'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2f0bbdda-f8b1-4958-a86f-80a30d6617ea'::uuid and card_print_id = 'e6183f85-c1c8-4f93-82b5-38964a5a4c39'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '06e5fe87-15d7-45c8-9c36-edca0c1d8e8b'::uuid and card_print_id = '7b071c37-8c72-4364-8df6-9b450c4ddf1c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4500171e-bffb-43c6-847e-760c0a39ad1a'::uuid and card_print_id = 'd501fbcc-245b-4f08-8303-4ea4d2a48ae1'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd9124075-c1be-4579-87e4-8ab759917d6f'::uuid and card_print_id = 'ad7f2469-1682-4695-9322-1a27823346c5'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '74d72aca-d92b-422e-abac-5f77b0c46a96'::uuid and card_print_id = '9c7cd6e8-9881-45e0-b8d8-8b8763dc4147'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '3edf0555-5536-417a-b5bf-23f36772d6ab'::uuid and card_print_id = 'dc19feb4-ef22-489d-92a0-2b8a2f6e0156'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '6cadbf53-fa25-48a9-a8d3-e6edc0fa199e'::uuid and card_print_id = '61bfff2c-ecad-4b47-833d-44b2454153cd'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '73a95060-b83f-4dfc-9cb5-6ffb29592a1e'::uuid and card_print_id = '127526a1-a4c1-4066-ae0f-264e08d71984'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'b951885d-8306-4ff7-897e-7c0c1bff46f1'::uuid and card_print_id = '260439c9-4180-447f-bd74-71604ebfad43'::uuid and finish_key = 'reverse';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
