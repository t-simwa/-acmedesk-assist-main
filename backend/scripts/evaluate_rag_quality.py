"""
RAG Quality Evaluation Script

This script evaluates the RAG system's quality by:
1. Running a set of test questions through the RAG pipeline
2. Evaluating answer accuracy and detecting hallucinations
3. Recording metrics (accuracy rate, response times, source quality)
4. Generating a detailed evaluation report

Usage:
    cd backend
    python scripts/evaluate_rag_quality.py

Output:
    - Console output with progress and summary
    - JSON report file: backend/scripts/rag_evaluation_report.json
"""

import sys
import json
import asyncio
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import re

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.services.rag import process_chat_query
from app.rag.vector_store import VectorStore
from app.rag.embeddings import get_embedding_model


class RAGEvaluator:
    """Evaluates RAG system quality using a test question set."""
    
    def __init__(self, test_questions_path: Path, output_report_path: Path):
        self.test_questions_path = test_questions_path
        self.output_report_path = output_report_path
        self.settings = get_settings()
        self.results: List[Dict[str, Any]] = []
        
    async def initialize_rag_components(self):
        """Initialize RAG components (vector store, embeddings)."""
        print("Initializing RAG components...")
        
        try:
            # Initialize embedding model
            self.embedding_model = get_embedding_model()
            print("✓ Embedding model loaded")
            
            # Initialize vector store
            self.vector_store = VectorStore(
                collection_name=self.settings.vector_collection_name,
                persist_directory=self.settings.vector_store_persist_dir
            )
            print("✓ Vector store initialized")
            
            # Check if vector store has data
            collection_count = self.vector_store.collection.count()
            if collection_count == 0:
                print("⚠ Warning: Vector store appears to be empty. Run ingestion script first.")
                print("   Run: python scripts/ingest_examples.py")
            else:
                print(f"✓ Vector store contains {collection_count} chunks")
                
        except Exception as e:
            print(f"✗ Error initializing RAG components: {e}")
            raise
    
    def load_test_questions(self) -> Dict[str, Any]:
        """Load test questions from JSON file."""
        print(f"Loading test questions from {self.test_questions_path}...")
        
        if not self.test_questions_path.exists():
            raise FileNotFoundError(
                f"Test questions file not found: {self.test_questions_path}\n"
                f"Expected location: backend/scripts/test_questions.json"
            )
        
        with open(self.test_questions_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✓ Loaded {len(data['questions'])} test questions")
        return data
    
    async def evaluate_question(
        self, 
        question_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate a single question through the RAG pipeline.
        
        Returns evaluation result with answer, sources, metrics, and quality scores.
        """
        question_id = question_data['id']
        question = question_data['question']
        category = question_data.get('category', 'unknown')
        expected_topics = question_data.get('expected_topics', [])
        expected_documents = question_data.get('expected_documents', [])
        
        print(f"\n[{question_id}] Evaluating: {question[:60]}...")
        
        # Record start time
        start_time = time.time()
        
        try:
            # Run question through RAG pipeline
            answer, sources = await process_chat_query(query=question, top_k=5)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Evaluate answer quality
            quality_metrics = self._evaluate_answer_quality(
                question=question,
                answer=answer,
                sources=sources,
                expected_topics=expected_topics,
                expected_documents=expected_documents
            )
            
            # Build result
            result = {
                'question_id': question_id,
                'question': question,
                'category': category,
                'answer': answer,
                'sources_count': len(sources),
                'sources': [
                    {
                        'doc_id': src.doc_id,
                        'title': src.title,
                        'score': src.score,
                        'snippet': src.snippet[:200] if src.snippet else None
                    }
                    for src in sources
                ],
                'response_time_ms': round(response_time_ms, 2),
                'expected_topics': expected_topics,
                'expected_documents': expected_documents,
                'quality_metrics': quality_metrics,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Print summary
            accuracy = quality_metrics.get('accuracy_score', 0)
            has_hallucination = quality_metrics.get('has_hallucination', False)
            sources_found = quality_metrics.get('expected_documents_found', 0)
            
            print(f"  ✓ Answer generated ({len(answer)} chars)")
            print(f"  ✓ Sources: {len(sources)} chunks")
            print(f"  ✓ Accuracy: {accuracy:.2%}")
            print(f"  ✓ Expected docs found: {sources_found}/{len(expected_documents)}")
            if has_hallucination:
                print(f"  ⚠ Potential hallucination detected")
            else:
                print(f"  ✓ No hallucination detected")
            
            return result
            
        except Exception as e:
            print(f"  ✗ Error evaluating question: {e}")
            return {
                'question_id': question_id,
                'question': question,
                'category': category,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
    
    def _evaluate_answer_quality(
        self,
        question: str,
        answer: str,
        sources: List[Any],
        expected_topics: List[str],
        expected_documents: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate answer quality by checking:
        1. Coverage of expected topics
        2. Presence of expected documents in sources
        3. Potential hallucinations (information not in sources)
        """
        answer_lower = answer.lower()
        
        # Check topic coverage
        topics_found = 0
        for topic in expected_topics:
            # Check if topic or key parts appear in answer
            topic_lower = topic.lower()
            if topic_lower in answer_lower:
                topics_found += 1
        
        topic_coverage = topics_found / len(expected_topics) if expected_topics else 0
        
        # Check expected documents in sources
        source_doc_ids = [src.doc_id for src in sources]
        expected_docs_found = sum(
            1 for doc in expected_documents
            if any(doc in doc_id for doc_id in source_doc_ids)
        )
        
        # Simple hallucination detection:
        # Check if answer contains information that's not obviously in sources
        # This is a basic heuristic - more sophisticated methods could be added
        has_hallucination = False
        
        if sources:
            # Extract key facts/numbers from answer
            # Look for specific numbers, dates, or technical terms
            answer_facts = self._extract_facts(answer)
            source_texts = ' '.join([src.snippet or '' for src in sources]).lower()
            
            # Check if answer contains facts not in sources
            for fact in answer_facts:
                if fact and fact.lower() not in source_texts:
                    # This might be a hallucination, but could also be inference
                    # We'll flag it but not be too strict
                    if len(fact) > 10:  # Only flag substantial facts
                        has_hallucination = True
                        break
        
        # Calculate overall accuracy score
        # Weight: 60% topic coverage, 30% document relevance, 10% hallucination penalty
        accuracy_score = (
            topic_coverage * 0.6 +
            (expected_docs_found / len(expected_documents) if expected_documents else 1.0) * 0.3 +
            (0.1 if not has_hallucination else 0.0)
        )
        
        return {
            'topic_coverage': round(topic_coverage, 3),
            'topics_found': topics_found,
            'topics_total': len(expected_topics),
            'expected_documents_found': expected_docs_found,
            'expected_documents_total': len(expected_documents),
            'has_hallucination': has_hallucination,
            'accuracy_score': round(accuracy_score, 3)
        }
    
    def _extract_facts(self, text: str) -> List[str]:
        """Extract potential facts from text (numbers, dates, specific terms)."""
        facts = []
        
        # Extract numbers with context
        number_pattern = r'\$\d+[,\d]*|\d+%|\d+\.\d+|\d+'
        numbers = re.findall(number_pattern, text)
        facts.extend(numbers)
        
        # Extract dates
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}'
        dates = re.findall(date_pattern, text)
        facts.extend(dates)
        
        return facts[:10]  # Limit to avoid too many false positives
    
    async def run_evaluation(self):
        """Run full evaluation on all test questions."""
        print("=" * 80)
        print("RAG Quality Evaluation")
        print("=" * 80)
        
        # Initialize RAG components
        await self.initialize_rag_components()
        
        # Load test questions
        test_data = self.load_test_questions()
        
        # Evaluate each question
        print(f"\nEvaluating {len(test_data['questions'])} questions...")
        print("-" * 80)
        
        for question_data in test_data['questions']:
            result = await self.evaluate_question(question_data)
            self.results.append(result)
        
        # Generate summary report
        self._generate_report(test_data)
    
    def _generate_report(self, test_data: Dict[str, Any]):
        """Generate evaluation report with metrics and summary."""
        print("\n" + "=" * 80)
        print("Evaluation Summary")
        print("=" * 80)
        
        # Calculate aggregate metrics
        total_questions = len(self.results)
        successful_questions = sum(1 for r in self.results if 'error' not in r)
        failed_questions = total_questions - successful_questions
        
        if successful_questions == 0:
            print("⚠ No successful evaluations. Check RAG pipeline setup.")
            return
        
        # Calculate average metrics
        avg_response_time = sum(
            r.get('response_time_ms', 0) for r in self.results if 'response_time_ms' in r
        ) / successful_questions
        
        avg_accuracy = sum(
            r.get('quality_metrics', {}).get('accuracy_score', 0)
            for r in self.results if 'quality_metrics' in r
        ) / successful_questions
        
        avg_sources = sum(
            r.get('sources_count', 0) for r in self.results if 'sources_count' in r
        ) / successful_questions
        
        hallucinations = sum(
            1 for r in self.results
            if r.get('quality_metrics', {}).get('has_hallucination', False)
        )
        
        hallucination_rate = hallucinations / successful_questions if successful_questions > 0 else 0
        
        # Print summary
        print(f"\nTotal Questions: {total_questions}")
        print(f"Successful: {successful_questions}")
        print(f"Failed: {failed_questions}")
        print(f"\nAverage Response Time: {avg_response_time:.2f} ms")
        print(f"Average Accuracy Score: {avg_accuracy:.2%}")
        print(f"Average Sources per Answer: {avg_sources:.1f}")
        print(f"Hallucination Rate: {hallucination_rate:.2%} ({hallucinations}/{successful_questions})")
        
        # Category breakdown
        category_stats: Dict[str, List[float]] = {}
        for result in self.results:
            if 'quality_metrics' in result:
                category = result.get('category', 'unknown')
                if category not in category_stats:
                    category_stats[category] = []
                category_stats[category].append(
                    result['quality_metrics'].get('accuracy_score', 0)
                )
        
        if category_stats:
            print("\nAccuracy by Category:")
            for category, scores in category_stats.items():
                avg_score = sum(scores) / len(scores)
                print(f"  {category.capitalize()}: {avg_score:.2%} ({len(scores)} questions)")
        
        # Save detailed report
        report = {
            'evaluation_metadata': {
                'test_set_name': test_data.get('test_set_name', 'Unknown'),
                'test_set_version': test_data.get('version', '1.0'),
                'evaluation_date': datetime.utcnow().isoformat() + 'Z',
                'total_questions': total_questions,
                'successful_questions': successful_questions,
                'failed_questions': failed_questions
            },
            'summary_metrics': {
                'average_response_time_ms': round(avg_response_time, 2),
                'average_accuracy_score': round(avg_accuracy, 3),
                'average_sources_per_answer': round(avg_sources, 1),
                'hallucination_rate': round(hallucination_rate, 3),
                'hallucination_count': hallucinations
            },
            'category_breakdown': {
                category: {
                    'average_accuracy': round(sum(scores) / len(scores), 3),
                    'question_count': len(scores)
                }
                for category, scores in category_stats.items()
            },
            'detailed_results': self.results
        }
        
        # Save report to file
        with open(self.output_report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Detailed report saved to: {self.output_report_path}")
        print("\n" + "=" * 80)


async def main():
    """Main entry point for the evaluation script."""
    # Set up paths
    scripts_dir = Path(__file__).parent
    test_questions_path = scripts_dir / 'test_questions.json'
    output_report_path = scripts_dir / 'rag_evaluation_report.json'
    
    # Create evaluator and run
    evaluator = RAGEvaluator(
        test_questions_path=test_questions_path,
        output_report_path=output_report_path
    )
    
    try:
        await evaluator.run_evaluation()
    except KeyboardInterrupt:
        print("\n\nEvaluation interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
