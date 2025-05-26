
import { ProcessTemplate } from '../types';

export const processTemplates: ProcessTemplate[] = [
  {
    templateName: "FASTQC",
    templateDescription: "Run FastQC on FASTQ files.",
    processNameSuggestion: "FASTQC_PROCESS",
    description: "Performs quality control on FASTQ files using FastQC.",
    inputDeclarations: `tuple val(meta), path(reads) // Each element is a FASTQ file (e.g., sample_R1.fastq.gz)`,
    outputDeclarations: `tuple val(meta), path("*.zip"), emit: zip
tuple val(meta), path("*.html"), emit: html
path "versions.yml", emit: versions`,
    directiveDeclarations: `tag "\${meta.id}"
publishDir "\${params.outdir}/fastqc/\${meta.id}", mode: 'copy', pattern: "*.{zip,html}"`,
    script: `#!/bin/bash
fastqc -o . --nogroup -q \${reads}

cat <<-END_VERSIONS > versions.yml
"\$(echo \${task.process} | sed 's_PROCESS$//' | tr '[:lower:]' '[:upper:]')":
    fastqc: \$(fastqc --version | sed 's/FastQC v//')
END_VERSIONS`
  },
  {
    templateName: "BWA_MEM_ALIGN",
    templateDescription: "Align paired-end reads with BWA-MEM.",
    processNameSuggestion: "BWA_MEM",
    description: "Aligns paired-end FASTQ reads to a reference genome using BWA-MEM and converts to sorted BAM.",
    inputDeclarations: `tuple val(meta), path(reads) // Paired-end reads e.g. [sample_R1.fq.gz, sample_R2.fq.gz]
path index // BWA index path prefix
val num_cpus`,
    outputDeclarations: `tuple val(meta), path("*.bam"), emit: bam
tuple val(meta), path("*.bai"), emit: bai
path "versions.yml", emit: versions`,
    directiveDeclarations: `tag "\${meta.id}"
publishDir "\${params.outdir}/bwa/\${meta.id}", mode: 'copy'`,
    script: `#!/bin/bash
# Ensure reads is an array; if single string, it might be R1, R2 space separated
# This template assumes reads is a list/array from Nextflow channel
# For simplicity, assuming \${reads[0]} is R1 and \${reads[1]} is R2 if it's a pair.
# A more robust script would check the structure of 'reads'.

bwa mem -t \${num_cpus ?: task.cpus} \\
    \${index} \\
    \${reads[0]} \\
    \${reads[1]} | \\
    samtools view -Sb - > \${meta.id}.unsorted.bam

samtools sort -@ \${num_cpus ?: task.cpus} -o \${meta.id}.bam \${meta.id}.unsorted.bam
samtools index \${meta.id}.bam

cat <<-END_VERSIONS > versions.yml
"\$(echo \${task.process} | sed 's_PROCESS$//' | tr '[:lower:]' '[:upper:]')":
    bwa: \$(bwa 2>&1 | grep Version | sed 's/Version: //')
    samtools: \$(samtools --version | head -n 1 | sed 's/samtools //')
END_VERSIONS`
  },
  {
    templateName: "SIMPLE_ECHO",
    templateDescription: "A very simple process that echos an input.",
    processNameSuggestion: "ECHO_INPUT",
    description: "Echos the input value to a file.",
    inputDeclarations: `val x`,
    outputDeclarations: `path "output.txt", emit: result`,
    directiveDeclarations: `tag "\${x}"`,
    script: `#!/bin/bash
echo "\${x}" > output.txt`
  },
];
